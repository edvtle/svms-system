import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import AnimatedContent from '../../components/ui/AnimatedContent';
import SearchBar from '../../components/ui/SearchBar';
import { Bell, Filter } from 'lucide-react';
import { getAuditHeaders } from '@/lib/auditHeaders';

const columns = [
	{ key: 'date', label: 'Date Logged', width: 'w-40' },
	{ key: 'violation', label: 'Violation', width: 'w-[30rem]' },
	{ key: 'type', label: 'Type', width: 'w-64' },
	{ key: 'reportedBy', label: 'Reported by', width: 'w-40' },
	{ key: 'remarks', label: 'Remarks' },
	{
		key: 'status',
		label: 'Status',
		width: 'w-32',
		render: (value) => (
			<span
				className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
					value === 'Cleared'
						? 'bg-green-100 text-green-700'
						: 'bg-amber-100 text-amber-700'
				}`}
			>
				{value}
			</span>
		),
	},
];

function normalizeType(record) {
	const category = String(record?.violation_category || '').trim();
	const degree = String(record?.violation_degree || '').trim();

	if (category && degree) {
		return `${category} - ${degree}`;
	}

	return category || degree || 'Not specified';
}

function parseNotificationMetadata(rawMetadata) {
	if (!rawMetadata) return null;
	if (typeof rawMetadata === 'object') return rawMetadata;

	try {
		return JSON.parse(rawMetadata);
	} catch (_error) {
		return null;
	}
}

const StudentViolations = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const highlightId = new URLSearchParams(location.search).get('highlight');
	const [records, setRecords] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('All');
	const [unreadCount, setUnreadCount] = useState(0);
	const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const loadData = async ({ silent = false } = {}) => {
			try {
				if (isMounted && !silent) {
					setIsLoading(true);
					setError('');
				}

				const [recordsResp, notificationsResp] = await Promise.all([
					fetch('/api/student-violations/me', { headers: { ...getAuditHeaders() } }),
					fetch('/api/notifications', { headers: { ...getAuditHeaders() } }),
				]);

				const recordsData = await recordsResp.json().catch(() => ({}));
				const notificationsData = await notificationsResp.json().catch(() => ({}));

				if (isMounted) {
					if (recordsResp.ok) {
						setRecords(Array.isArray(recordsData.records) ? recordsData.records : []);
						setHasLoadedOnce(true);
					} else {
						setError(recordsData.message || 'Unable to refresh your violations.');
					}

					if (notificationsResp.ok) {
						const unreadViolationUpdates = (notificationsData.notifications || []).filter(
							(note) => {
								const metadata = parseNotificationMetadata(note?.metadata);
								const type = String(metadata?.type || '').toLowerCase();
								return !note?.read_at && type.startsWith('student_violation_');
							},
						).length;
						setUnreadCount(unreadViolationUpdates);
					}
				}
			} catch (_error) {
				if (isMounted) {
					setError('Unable to refresh your violations right now.');
				}
			} finally {
				if (isMounted && !silent) {
					setIsLoading(false);
				}
			}
		};

		loadData();
		const intervalId = setInterval(() => loadData({ silent: true }), 15000);

		return () => {
			isMounted = false;
			clearInterval(intervalId);
		};
	}, []);

	const tableData = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();

		return (records || [])
			.filter((row) => {
				const status = row?.cleared_at ? 'Cleared' : 'Active';
				const typeText = normalizeType(row).toLowerCase();
				const violationText = String(row?.violation_label || row?.violation_name || '').toLowerCase();
				const remarksText = String(row?.remarks || '').toLowerCase();

				const matchesSearch =
					!query ||
					violationText.includes(query) ||
					typeText.includes(query) ||
					remarksText.includes(query);

				const matchesStatus = statusFilter === 'All' || status === statusFilter;
				return matchesSearch && matchesStatus;
			})
			.map((row) => {
				const createdAt = new Date(row.created_at);
				const displayDate = Number.isNaN(createdAt.getTime())
					? '-'
					: createdAt.toLocaleDateString();

				return {
					id: row.id,
					date: displayDate,
					violation: row.violation_label || row.violation_name || '-',
					type: normalizeType(row),
					reportedBy: row.reported_by || '-',
					remarks: row.remarks || '-',
					status: row.cleared_at ? 'Cleared' : 'Active',
				};
			});
	}, [records, searchTerm, statusFilter]);

	return (
		<AnimatedContent>
			<div className="flex flex-col gap-6">
				<h2 className="text-2xl font-bold text-white mb-1">MY VIOLATIONS</h2>

				{highlightId ? (
					<Card variant="glass" padding="sm" className="w-full border border-cyan-400/25 bg-cyan-500/10">
						<p className="text-cyan-100 text-sm">
							Showing update for violation record <span className="font-bold">#{highlightId}</span>.
						</p>
					</Card>
				) : null}

				{unreadCount > 0 ? (
					<Card variant="glass" padding="md" className="w-full border border-blue-400/25 bg-blue-500/10">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 text-blue-200">
								<Bell className="w-4 h-4" />
								<span className="text-sm font-semibold">
									You have {unreadCount} new update{unreadCount > 1 ? 's' : ''} about your violations.
								</span>
							</div>
							<Button
								variant="secondary"
								size="sm"
								onClick={() => navigate('/student/notifications')}
							>
								View Notifications
							</Button>
						</div>
					</Card>
				) : null}

				<Card variant="glass" padding="lg" className="w-full">
					<div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
						<h3 className="text-lg font-semibold text-white">Violation Records</h3>
						<div className="flex items-center gap-2">
							<SearchBar
								placeholder="Search violation, type, or remarks"
								className="w-72"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
							<Button
								variant="secondary"
								size="sm"
								className="gap-2 flex items-center"
								onClick={() =>
									setStatusFilter((prev) => {
										if (prev === 'All') return 'Active';
										if (prev === 'Active') return 'Cleared';
										return 'All';
									})
								}
							>
								<Filter className="w-4 h-4" />
								{statusFilter}
							</Button>
						</div>
					</div>

					{isLoading && !hasLoadedOnce ? (
						<div className="text-center text-gray-400 py-8">Loading violations...</div>
					) : (
						<>
							{error ? (
								<div className="mb-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
									{error}
								</div>
							) : null}
							<DataTable columns={columns} data={tableData} className="mt-2" />
						</>
					)}
				</Card>
			</div>
		</AnimatedContent>
	);
};

export default StudentViolations;
