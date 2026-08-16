/**
 * Phazon Backend — Academic Resources Controller
 * Secure document management, file validation, storage uploading, signed download URLs, and notifications.
 */

'use strict';

const supabase = require('../config/supabase');
const { assertDepartmentScope } = require('../middleware/scopeGuard');
const { notifyClass, notifyDepartment } = require('../services/notificationService');

const MAX_ACADEMIC_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_RESOURCE_TYPES = [
  'LECTURE_NOTE',
  'STUDY_MATERIAL',
  'QUESTION_PAPER',
  'SYLLABUS',
  'REFERENCE',
  'ASSIGNMENT_RESOURCE',
  'EXAM_RESOURCE',
  'ACADEMIC_NOTICE',
  'OTHER'
];

const FORBIDDEN_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.js', '.vbs', '.dll', '.scr', '.jar', '.com', '.msi', '.pif'];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/jpg'
];

function sanitizeFilename(filename) {
  if (!filename) return 'document.pdf';
  // Strip path traversal and dangerous characters
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * GET /api/resources
 * Retrieve resources authorized for current user with search & filters.
 */
async function getResources(req, res, next) {
  try {
    const { userRole, userId, departmentId, classIds } = req;
    const { search, resource_type, course_id, class_id, department_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('academic_resources')
      .select('*, uploader:users!academic_resources_uploaded_by_fkey(name, email, role), course:courses(name, code), class:classes(name)', { count: 'exact' });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,file_name.ilike.%${search}%`);
    }

    if (resource_type) query = query.eq('resource_type', resource_type);
    if (course_id) query = query.eq('course_id', course_id);
    if (class_id) query = query.eq('class_id', class_id);
    if (department_id) query = query.eq('department_id', department_id);

    // Role-based visibility isolation
    if (userRole === 'student') {
      const activeClasses = classIds || [];
      const conditions = ['visibility.eq.PUBLIC_INSTITUTION'];
      if (activeClasses.length > 0) {
        conditions.push(`class_id.in.(${activeClasses.join(',')})`);
      }
      if (departmentId) {
        conditions.push(`department_id.eq.${departmentId}`);
      }
      query = query.or(conditions.join(','));
    } else if (userRole === 'teacher') {
      const activeClasses = classIds || [];
      const conditions = [`uploaded_by.eq.${userId}`, 'visibility.eq.PUBLIC_INSTITUTION'];
      if (activeClasses.length > 0) {
        conditions.push(`class_id.in.(${activeClasses.join(',')})`);
      }
      if (departmentId) {
        conditions.push(`department_id.eq.${departmentId}`);
      }
      query = query.or(conditions.join(','));
    } else if (userRole === 'hod') {
      const conditions = [`uploaded_by.eq.${userId}`, 'visibility.eq.PUBLIC_INSTITUTION'];
      if (departmentId) {
        conditions.push(`department_id.eq.${departmentId}`);
      }
      query = query.or(conditions.join(','));
    }

    const { data: resources, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: resources || [],
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/resources/:id
 */
async function getResourceById(req, res, next) {
  try {
    const { id } = req.params;
    const { userRole, userId, classIds, departmentId } = req;

    const { data: resource, error } = await supabase
      .from('academic_resources')
      .select('*, uploader:users!academic_resources_uploaded_by_fkey(name, email, role), course:courses(name, code), class:classes(name)')
      .eq('id', id)
      .single();

    if (error || !resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    // M5 FIX: Authorization check matching getResources visibility rules
    if (userRole === 'student') {
      const isEnrolled = resource.class_id && (classIds || []).includes(resource.class_id);
      const isDeptMatch = resource.department_id && resource.department_id === departmentId;
      const isPublic = resource.visibility === 'PUBLIC_INSTITUTION';
      if (!isEnrolled && !isDeptMatch && !isPublic) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this resource.' });
      }
    } else if (userRole === 'teacher') {
      const isOwn = resource.uploaded_by === userId;
      const isEnrolled = resource.class_id && (classIds || []).includes(resource.class_id);
      const isDeptMatch = resource.department_id && resource.department_id === departmentId;
      const isPublic = resource.visibility === 'PUBLIC_INSTITUTION';
      if (!isOwn && !isEnrolled && !isDeptMatch && !isPublic) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this resource.' });
      }
    } else if (userRole === 'hod') {
      const isOwn = resource.uploaded_by === userId;
      const isDeptMatch = resource.department_id && resource.department_id === departmentId;
      const isPublic = resource.visibility === 'PUBLIC_INSTITUTION';
      if (!isOwn && !isDeptMatch && !isPublic) {
        return res.status(403).json({ success: false, message: 'Forbidden: This resource is not in your department.' });
      }
    }
    // Admin has full access

    return res.status(200).json({ success: true, data: resource });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/resources
 * Upload file & create resource metadata.
 */
async function uploadResource(req, res, next) {
  try {
    const { title, description, resource_type, course_id, class_id, department_id, file_name, file_size, mime_type, file_data_base64 } = req.body;
    const { userId, userRole } = req;

    if (userRole === 'student') {
      return res.status(403).json({ success: false, message: 'Forbidden: Students cannot upload resources.' });
    }

    if (!title || !resource_type || !file_name || !file_size) {
      return res.status(400).json({ success: false, message: 'title, resource_type, file_name, and file_size are required.' });
    }

    if (!ALLOWED_RESOURCE_TYPES.includes(resource_type)) {
      return res.status(400).json({ success: false, message: `Invalid resource_type. Must be one of: ${ALLOWED_RESOURCE_TYPES.join(', ')}` });
    }

    // Executable Rejection
    const lowerName = file_name.toLowerCase();
    for (const ext of FORBIDDEN_EXTENSIONS) {
      if (lowerName.endsWith(ext)) {
        return res.status(400).json({ success: false, message: `Forbidden: Executable format (${ext}) is strictly prohibited.` });
      }
    }

    // File Size Validation
    if (parseInt(file_size, 10) > MAX_ACADEMIC_FILE_SIZE) {
      return res.status(400).json({ success: false, message: 'File too large. Maximum allowed size is 25 MB.' });
    }

    // SCOPE AUTHORIZATION
    if (userRole === 'teacher') {
      if (class_id) {
        const { data: assg } = await supabase.from('teacher_assignments').select('id').eq('teacher_id', userId).eq('class_id', class_id).maybeSingle();
        if (!assg) return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this class.' });
      }
    } else if (userRole === 'hod') {
      if (department_id) assertDepartmentScope(req, department_id);
    }

    const cleanFilename = sanitizeFilename(file_name);
    const resourceId = require('crypto').randomUUID();
    const deptFolder = department_id || req.departmentId || 'global';
    const courseFolder = course_id || 'general';
    const storagePath = `${deptFolder}/${courseFolder}/${resourceId}_${cleanFilename}`;

    // Upload to Supabase Storage if file_data_base64 is supplied
    if (file_data_base64) {
      const buffer = Buffer.from(file_data_base64, 'base64');
      const { error: storageErr } = await supabase.storage
        .from('academic-resources')
        .upload(storagePath, buffer, { contentType: mime_type || 'application/pdf', upsert: true });

      if (storageErr) {
        console.warn('[ResourceStorage] Storage upload warning:', storageErr.message);
      }
    }

    // Create DB Metadata
    const { data: resource, error } = await supabase
      .from('academic_resources')
      .insert([{
        id: resourceId,
        title: title.trim(),
        description: description || null,
        file_path: storagePath,
        file_name: cleanFilename,
        file_size: parseInt(file_size, 10),
        mime_type: mime_type || 'application/pdf',
        resource_type,
        course_id: course_id || null,
        class_id: class_id || null,
        department_id: department_id || (userRole === 'hod' ? req.departmentId : null),
        uploaded_by: userId,
        visibility: 'AUTHORIZED'
      }])
      .select()
      .single();

    if (error) throw error;

    // Trigger Notification
    if (class_id) {
      notifyClass({
        class_id,
        sender_id: userId,
        type: 'ANNOUNCEMENT',
        title: `New Resource: ${title.trim()}`,
        message: `A new ${resource_type.replace('_', ' ')} "${title.trim()}" has been uploaded.`,
        entity_type: 'resource',
        entity_id: resource.id
      }).catch(err => console.error('[NotificationTrigger] Resource upload error:', err.message));
    }

    return res.status(201).json({ success: true, message: 'Resource uploaded successfully', data: resource });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/resources/:id/download
 * Generates authorized signed download URL.
 */
async function getDownloadUrl(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, userRole, classIds, departmentId } = req;

    const { data: resource } = await supabase.from('academic_resources').select('*').eq('id', id).single();
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });

    // Verify Authorization
    if (userRole === 'student') {
      const isEnrolled = resource.class_id && (classIds || []).includes(resource.class_id);
      const isDeptMatch = resource.department_id && resource.department_id === departmentId;
      const isPublic = resource.visibility === 'PUBLIC_INSTITUTION';
      if (!isEnrolled && !isDeptMatch && !isPublic) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this resource.' });
      }
    }

    // Try generating signed URL from Supabase Storage
    const { data: signedData, error: signedErr } = await supabase.storage
      .from('academic-resources')
      .createSignedUrl(resource.file_path, 3600);

    const downloadUrl = (signedData && signedData.signedUrl)
      ? signedData.signedUrl
      : `${req.protocol}://${req.get('host')}/api/resources/${id}/stream`;

    return res.status(200).json({
      success: true,
      download_url: downloadUrl,
      file_name: resource.file_name,
      mime_type: resource.mime_type,
      file_size: resource.file_size
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/resources/:id
 * Edit resource metadata (owner/Admin only).
 */
async function updateResource(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, resource_type } = req.body;
    const { userId, userRole } = req;

    const { data: existing } = await supabase.from('academic_resources').select('uploaded_by').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Resource not found' });

    if (existing.uploaded_by !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only the uploader or Admin can edit metadata.' });
    }

    const { data: updated, error } = await supabase
      .from('academic_resources')
      .update({
        title: title ? title.trim() : undefined,
        description: description !== undefined ? description : undefined,
        resource_type: resource_type || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/resources/:id
 * Remove storage file and metadata (owner/Admin only).
 */
async function deleteResource(req, res, next) {
  try {
    const { id } = req.params;
    const { userId, userRole } = req;

    const { data: existing } = await supabase.from('academic_resources').select('uploaded_by, file_path').eq('id', id).single();
    if (!existing) return res.status(404).json({ success: false, message: 'Resource not found' });

    if (existing.uploaded_by !== userId && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only the uploader or Admin can delete this resource.' });
    }

    // Delete Storage file
    if (existing.file_path) {
      await supabase.storage.from('academic-resources').remove([existing.file_path]);
    }

    // Delete DB record
    const { error } = await supabase.from('academic_resources').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Resource deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getResources,
  getResourceById,
  uploadResource,
  getDownloadUrl,
  updateResource,
  deleteResource,
};
