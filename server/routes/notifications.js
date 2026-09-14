import express from 'express';
import supabase from '../supabase.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Helper to create a notification for a single user
 */
export async function createNotification(recipientPortalId, senderPortalId, type, title, message, entityType, entityId) {
  try {
    await supabase.from('notifications').insert({
      recipient_portal_id: recipientPortalId,
      sender_portal_id: senderPortalId,
      type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

/**
 * Helper to bulk create notifications
 */
export async function createNotificationsBulk(recipients, senderPortalId, type, title, message, entityType, entityId) {
  if (!recipients || recipients.length === 0) return;
  try {
    const payload = recipients.map(recipientId => ({
      recipient_portal_id: recipientId,
      sender_portal_id: senderPortalId,
      type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId
    }));
    await supabase.from('notifications').insert(payload);
  } catch (err) {
    console.error('Failed to bulk create notifications:', err.message);
  }
}

// GET /api/notifications/my — current user's notifications
router.get('/my', async (req, res) => {
  const { portal_id } = req.portalUser;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_portal_id', portal_id)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[notifications]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  const { portal_id } = req.portalUser;
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_portal_id', portal_id)
      .eq('is_read', false);
      
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    console.error('[notifications]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const { portal_id } = req.portalUser;
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('recipient_portal_id', portal_id) // Security check
      .select()
      .single();
      
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Notification not found' });
    res.json(data);
  } catch (err) {
    console.error('[notifications]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  const { portal_id } = req.portalUser;
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_portal_id', portal_id)
      .eq('is_read', false)
      .select();
      
    if (error) throw error;
    res.json({ success: true, count: data ? data.length : 0 });
  } catch (err) {
    console.error('[notifications]', err.message);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
});

export default router;
