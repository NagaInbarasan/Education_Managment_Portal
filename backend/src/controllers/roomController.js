/**
 * Phazon Backend — Rooms Controller
 * Management of physical academic spaces, room types, and capacities.
 */

'use strict';

const supabase = require('../config/supabase');

/**
 * GET /api/rooms
 */
async function getRooms(req, res, next) {
  try {
    const { department_id, room_type, min_capacity } = req.query;

    let query = supabase.from('rooms').select('*, department:departments(name, code)').eq('is_active', true);

    if (department_id) query = query.eq('department_id', department_id);
    if (room_type) query = query.eq('room_type', room_type);
    if (min_capacity) query = query.gte('capacity', parseInt(min_capacity, 10));

    const { data: rooms, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, data: rooms || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rooms
 */
async function createRoom(req, res, next) {
  try {
    const { name, building, capacity, room_type, department_id } = req.body;
    const { userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff access required.' });
    }

    if (!name) {
      return res.status(400).json({ success: false, message: 'Room name is required.' });
    }

    const { data: room, error } = await supabase
      .from('rooms')
      .insert([{
        name: name.trim(),
        building: building ? building.trim() : null,
        capacity: capacity ? parseInt(capacity, 10) : 60,
        room_type: room_type || 'CLASSROOM',
        department_id: department_id || (userRole === 'hod' ? req.departmentId : null),
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/rooms/:id
 */
async function updateRoom(req, res, next) {
  try {
    const { id } = req.params;
    const { name, building, capacity, room_type, is_active } = req.body;
    const { userRole } = req;

    if (!['admin', 'hod'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Staff access required.' });
    }

    const { data: room, error } = await supabase
      .from('rooms')
      .update({
        name: name ? name.trim() : undefined,
        building: building !== undefined ? building : undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        room_type: room_type || undefined,
        is_active: is_active !== undefined ? is_active : undefined
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/rooms/:id
 */
async function deleteRoom(req, res, next) {
  try {
    const { id } = req.params;
    const { userRole } = req;

    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    }

    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Room deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
};
