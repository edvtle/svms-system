import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnimatedContent from '../../components/ui/AnimatedContent';
import Card from '../../components/ui/Card';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { getAuditHeaders } from '@/lib/auditHeaders';

const StudentNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAlertNotificationId, setSelectedAlertNotificationId] = useState(null);
  const [showAlertDetailsModal, setShowAlertDetailsModal] = useState(false);
  const [highlightedNotificationId, setHighlightedNotificationId] = useState(null);
  const isFetchingRef = useRef(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');

  const selectedAlertNotification = useMemo(
    () => notifications.find((note) => String(note.id) === String(selectedAlertNotificationId)) || null,
    [notifications, selectedAlertNotificationId],
  );

  const parseNotificationMetadata = (rawMetadata) => {
    if (!rawMetadata) return null;
    if (typeof rawMetadata === 'object') return rawMetadata;

    try {
      return JSON.parse(rawMetadata);
    } catch (_error) {
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async ({ silent = false } = {}) => {
      if (isFetchingRef.current) {
        if (!silent && isMounted) {
          setLoading(false);
        }
        return;
      }
      isFetchingRef.current = true;

      if (!silent) {
        setLoading(true);
        setError('');
      }

      try {
        const resp = await fetch('/api/notifications', {
          headers: { ...getAuditHeaders() },
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok) {
          if (isMounted) {
            const notifications = (data.notifications || []).map((note) => ({
              ...note,
              metadata: parseNotificationMetadata(note.metadata),
            }));
            setNotifications(notifications);
            if (!silent) setError('');
          }
        } else {
          if (isMounted && !silent) {
            setError(data.message || 'Unable to load notifications');
          }
        }
      } catch (err) {
        console.error('Notification fetch error', err);
        if (isMounted && !silent) {
          setError('Network error while fetching notifications');
        }
      } finally {
        isFetchingRef.current = false;
        if (isMounted && !silent) setLoading(false);
      }
    };

    loadNotifications();

    const intervalId = setInterval(() => loadNotifications({ silent: true }), 15000);

    return () => {
      isMounted = false;
      isFetchingRef.current = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!highlightParam) return;

    setHighlightedNotificationId(highlightParam);

    const timeoutId = setTimeout(() => {
      setHighlightedNotificationId(null);
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.delete('highlight');
      setSearchParams(nextParams, { replace: true });
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [highlightParam, setSearchParams]);

  useEffect(() => {
    if (!highlightedNotificationId) return;
    const target = document.getElementById(`student-notification-${highlightedNotificationId}`);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedNotificationId, notifications]);

  return (
    <>
      <AnimatedContent>
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold text-white mb-1">NOTIFICATION</h2>
          <Card variant="glass" padding="lg" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">&nbsp;</h3>
            <button
              className="text-gray-400 hover:text-white transition-colors"
              onClick={async () => {
                try {
                  await fetch('/api/notifications/mark-read-all', {
                    method: 'PUT',
                    headers: { ...getAuditHeaders() },
                  });
                  setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
                  window.dispatchEvent(new Event('notificationsRead'));
                } catch (err) {
                  console.error('Failed to mark all read', err);
                }
              }}
            >
              Mark all as read
            </button>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading notifications...</div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No notifications</div>
          ) : (
            <div className="space-y-2">
              {notifications.map((note) => (
                <div
                  key={note.id}
                  id={`student-notification-${note.id}`}
                  className={`bg-[#232528]/60 rounded-lg px-4 py-3 flex justify-between items-center border-b border-white/10 cursor-pointer hover:bg-[#232528]/80 ${!note.read_at ? 'ring-1 ring-blue-500/40 bg-blue-500/10' : ''} ${String(highlightedNotificationId) === String(note.id) ? 'ring-2 ring-yellow-400 bg-yellow-500/20 animate-pulse' : ''}`}
                  onClick={async () => {
                    // Mark as read if not already
                    if (!note.read_at) {
                      try {
                        await fetch(`/api/notifications/${note.id}/mark-read`, {
                          method: 'PUT',
                          headers: { ...getAuditHeaders() },
                        });
                        setNotifications(prev => prev.map(n => n.id === note.id ? { ...n, read_at: new Date().toISOString() } : n));
                      } catch (err) {
                        console.error('Failed to mark read', err);
                      }
                    }
                    // Navigate based on metadata
                    const metadataType = String(note.metadata?.type || '');

                    if (metadataType.startsWith('student_violation_')) {
                      if (note.metadata?.violationLogId) {
                        navigate(`/student/violations?highlight=${note.metadata.violationLogId}`);
                      } else {
                        navigate('/student/violations');
                      }
                    } else if (metadataType === 'admin_alert') {
                      setSelectedAlertNotificationId(note.id);
                      setShowAlertDetailsModal(true);
                    } else if (note.metadata?.violationId) {
                      const highlightParam = `?highlight=${note.metadata.violationId}`;
                      navigate(`/student/offenses${highlightParam}`);
                    } else {
                      navigate('/student/offenses');
                    }

                    // Emit event so sidebar/navbar refresh unread state
                    window.dispatchEvent(new Event('notificationRead'));
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {!note.read_at && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                      <span className={`text-white text-sm ${!note.read_at ? 'font-bold' : 'font-medium'}`}>{note.title}</span>
                    </div>
                    <div className={`text-gray-400 text-xs ${!note.read_at ? 'font-semibold' : ''}`}>{note.description}</div>
                    <div className="text-gray-500 text-xs mt-1">{new Date(note.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </Card>
        </div>
      </AnimatedContent>

      <Modal
        isOpen={showAlertDetailsModal}
        onClose={() => {
          setShowAlertDetailsModal(false);
          setSelectedAlertNotificationId(null);
        }}
        title={<span className="font-bold">Admin Alert Details</span>}
        size="md"
        showCloseButton
      >
        {selectedAlertNotification ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-orange-400/25 bg-orange-500/10 px-4 py-3">
              <p className="text-sm text-orange-200 font-semibold">{selectedAlertNotification.title}</p>
              <p className="text-xs text-orange-100 mt-1">
                Sent: {new Date(selectedAlertNotification.created_at).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-gray-400 text-xs mb-1">Alert Type</p>
                <p className="text-white font-medium">
                  {selectedAlertNotification.metadata?.alertType || 'Alert'}
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-gray-400 text-xs mb-1">Message from Admin</p>
                <p className="text-white font-medium whitespace-pre-wrap">
                  {selectedAlertNotification.description || selectedAlertNotification.metadata?.adminMessage || 'No message provided.'}
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-gray-400 text-xs mb-1">Related Violation Context</p>
                <p className="text-white font-medium">
                  Active violations: {Number(selectedAlertNotification.metadata?.activeViolationCount || 0)}
                </p>
              </div>
            </div>

            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAlertDetailsModal(false);
                  setSelectedAlertNotificationId(null);
                }}
                className="px-6 py-2.5"
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setShowAlertDetailsModal(false);
                  setSelectedAlertNotificationId(null);
                  navigate('/student/violations');
                }}
                className="px-6 py-2.5"
              >
                View Violations
              </Button>
            </ModalFooter>
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm text-gray-300">Unable to load alert details for this notification.</p>
          </div>
        )}
      </Modal>
    </>
  );
};

export default StudentNotification;
