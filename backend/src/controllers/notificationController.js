/**
 * Phazon Backend — Notification Controller
 * Handles fetching user notifications, unread counters, and updating read state.
 */

'use strict';

const supabase = require('../config/supabase');

/**
 * GET /api/notifications
 * Paginated notification list for authenticated recipient.
 */
async function getUserNotifications(req, res, next) {
  try {
    const recipient_id = req.userId;
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select('*, sender:users!notifications_sender_id_fkey(name, email, role)', { count: 'exact' })
      .eq('recipient_id', recipient_id);

    if (req.query.unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    if (req.query.type) {
      query = query.eq('type', req.query.type);
    }

    const { data: notifications, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: notifications || [],
      pagination: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/notifications/unread-count
 */
async function getUnreadCount(req, res, next) {
  try {
    const recipient_id = req.userId;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', recipient_id)
      .eq('is_read', false);

    if (error) throw error;

    return res.status(200).json({ success: true, unreadCount: count || 0 });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Recipient marks single notification as read.
 */
async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    const recipient_id = req.userId;

    // Verify ownership
    const { data: notif } = await supabase.from('notifications').select('recipient_id').eq('id', id).single();
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    if (notif.recipient_id !== recipient_id) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot update another user notification' });
    }

    const { data: updated, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
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
 * PATCH /api/notifications/read-all
 * Recipient marks all notifications as read.
 */
async function markAllRead(req, res, next) {
  try {
    const recipient_id = req.userId;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', recipient_id)
      .eq('is_read', false);

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
};
