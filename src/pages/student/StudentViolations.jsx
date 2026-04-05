import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import Modal, { ModalFooter } from '../../components/ui/Modal';
import AnimatedContent from '../../components/ui/AnimatedContent';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import { Bell, Download, Filter } from 'lucide-react';
import { getAuditHeaders } from '@/lib/auditHeaders';

const EXPORT_HEADER_IMAGE_PATH = '/plpasig_header.png';

const blobToDataUrl = (blob) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

const getDataUrlDimensions = (dataUrl) =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
		};
		img.onerror = () => reject(new Error('Unable to load image dimensions.'));
		img.src = dataUrl;
	});

// Column definitions are generated inside the component since they depend on triggerDownloadModal and record context.

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
	const [downloadModalOpen, setDownloadModalOpen] = useState(false);
	const [downloadFormat, setDownloadFormat] = useState('excel');
	const [selectedDownloadRecord, setSelectedDownloadRecord] = useState(null);
	const [downloadAllModalOpen, setDownloadAllModalOpen] = useState(false);
	const [downloadAllFormat, setDownloadAllFormat] = useState('excel');

	// Get student info from localStorage
	const getStudentInfo = useCallback(() => {
		try {
			const user = JSON.parse(localStorage.getItem('svms_user') || '{}');
			return {
				lastName: user?.lastName || user?.last_name || '',
				firstName: user?.firstName || user?.first_name || '',
			};
		} catch (_error) {
			return { lastName: '', firstName: '' };
		}
	}, []);

	// Resolve header image for exports
	const resolveHeaderImage = useCallback(async () => {
		try {
			const response = await fetch(EXPORT_HEADER_IMAGE_PATH);
			if (!response.ok) {
				throw new Error(`Header image not found: ${EXPORT_HEADER_IMAGE_PATH}`);
			}

			const blob = await response.blob();
			const dataUrl = await blobToDataUrl(blob);
			const dimensions = await getDataUrlDimensions(dataUrl);

			return { dataUrl, dimensions };
		} catch (_error) {
			return { dataUrl: null, dimensions: null };
		}
	}, []);

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

	const formatDateForFileName = (rawDate) => {
	const parsedDate = new Date(rawDate || new Date().toISOString());
	if (Number.isNaN(parsedDate.getTime())) {
		return new Date().toISOString().split('T')[0];
	}
	return parsedDate.toISOString().split('T')[0];
};

const formatDisplayDate = (rawDate) => {
	const parsedDate = new Date(rawDate || new Date().toISOString());
	if (Number.isNaN(parsedDate.getTime())) {
		return '-';
	}
	return parsedDate.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
};

const formatDownloadFileName = useCallback((record, format, isAllRecords = false, studentInfo = {}) => {
	// Use provided student info first, then fall back to record data
	let surname = studentInfo.lastName ? studentInfo.lastName.trim().replace(/\s+/g, '_') : '';
	let givenName = studentInfo.firstName ? studentInfo.firstName.trim().replace(/\s+/g, '_') : '';

	// Fallback to record data if not provided
	if (!surname) {
		const recordSurname = (record?.student_last_name || record?.last_name || record?.surname || '').toString().trim();
		surname = recordSurname ? recordSurname.replace(/\s+/g, '_') : '';
	}
	if (!givenName) {
		const recordFirstName = (record?.student_first_name || record?.first_name || record?.given_name || '').toString().trim();
		givenName = recordFirstName ? recordFirstName.replace(/\s+/g, '_') : '';
	}

	// Build student segment - NEVER use "Unknown_Student"
	const studentSegment = [surname, givenName].filter(Boolean).join('_');
	if (!studentSegment) {
		console.warn('Warning: Unable to determine student name for export');
	}
	
	const violationSegment = isAllRecords 
		? 'AllViolations'
		: (record?.violation || record?.violation_label || record?.violation_name || 'Violation')
			.toString()
			.trim()
			.replace(/\s+/g, '_');
	
	const dateSegment = formatDateForFileName(record?.createdAtRaw || record?.date || new Date().toISOString());

	const sanitize = (text) =>
		String(text || '')
			.replace(/[\\/:*?"<>|]/g, '')
			.trim();

	const safeStudentSegment = sanitize(studentSegment);
	const safeViolationSegment = sanitize(violationSegment).replace(/\s+/g, '_');
	const ext = format === 'pdf' ? 'pdf' : 'xlsx';

	return `${safeStudentSegment}_${safeViolationSegment}_${dateSegment}.${ext}`;
}, [formatDateForFileName]);

const createDownload = useCallback(async (record, format) => {
	if (!record) return;

	const studentInfo = getStudentInfo();

	const sheetData = [{
		Date: formatDisplayDate(record.createdAtRaw || record.date),
		Violation: record.violation || record.violation_label || record.violation_name || '-',
		Type: record.type || normalizeType(record),
		'Reported by': record.reportedBy || record.reported_by || '-',
		Remarks: record.remarks || '-',
		Status: record.status || (record.cleared_at ? 'Cleared' : 'Active') || '-',
	}];

	const filename = formatDownloadFileName(record, format, false, studentInfo);

	if (format === 'excel') {
		try {
			const [{ Workbook }, { dataUrl, dimensions }] = await Promise.all([
				import('exceljs'),
				resolveHeaderImage(),
			]);
			const workbook = new Workbook();
			const sheet = workbook.addWorksheet('Violation Report', {
				views: [{ state: 'frozen', ySplit: 6 }],
			});

			sheet.columns = [
				{ key: 'Date', width: 18 },
				{ key: 'Violation', width: 40 },
				{ key: 'Type', width: 24 },
				{ key: 'Reported by', width: 20 },
				{ key: 'Remarks', width: 44 },
				{ key: 'Status', width: 16 },
			];

			sheet.mergeCells('A1:F3');
			sheet.mergeCells('A4:F4');
			sheet.mergeCells('A5:F5');
			sheet.getRow(1).height = 26;
			sheet.getRow(2).height = 26;
			sheet.getRow(3).height = 26;
			sheet.getRow(4).height = 28;
			sheet.getRow(5).height = 18;

			// Add header image if available
			if (dataUrl && dimensions) {

				const headerRegionWidthPx = sheet.columns.reduce(
					(total, column) => total + (Number(column.width || 10) * 7.5),
					0,
				);
				const headerRegionHeightPx = [1, 2, 3].reduce(
					(total, rowNumber) => total + (Number(sheet.getRow(rowNumber).height || 15) * 1.333),
					0,
				);
				const imageScale = Math.min(
					(headerRegionWidthPx - 24) / dimensions.width,
					(headerRegionHeightPx - 6) / dimensions.height,
					1,
				);
				const imageWidthPx = Math.max(8, Math.round(dimensions.width * imageScale));
				const imageHeightPx = Math.max(8, Math.round(dimensions.height * imageScale));
				const leftOffsetPx = Math.max((headerRegionWidthPx - imageWidthPx) / 2, 0);
				const topOffsetPx = Math.max((headerRegionHeightPx - imageHeightPx) / 2, 0);

				const toColCoordinate = (pixelOffset) => {
					let remaining = pixelOffset;
					for (let colIndex = 1; colIndex <= 6; colIndex += 1) {
						const colWidth = sheet.getColumn(colIndex).width || 15;
						const colPx = colWidth * 7.5;
						if (remaining <= colPx) {
							return (colIndex - 1) + remaining / colPx;
						}
						remaining -= colPx;
					}
					return 0;
				};

				const toRowCoordinate = (pixelOffset) => {
					let remaining = pixelOffset;
					for (let rowIndex = 1; rowIndex <= 3; rowIndex += 1) {
						const rowPx = Number(sheet.getRow(rowIndex).height || 15) * 1.333;
						if (remaining <= rowPx) {
							return (rowIndex - 1) + remaining / rowPx;
						}
						remaining -= rowPx;
					}
					return 2;
				};

				const imageId = workbook.addImage({ base64: dataUrl, extension: 'png' });
				sheet.addImage(imageId, {
					tl: {
						col: toColCoordinate(leftOffsetPx),
						row: toRowCoordinate(topOffsetPx),
					},
					ext: {
						width: imageWidthPx,
						height: imageHeightPx,
					},
				});

				const titleCell = sheet.getCell('A4');
				titleCell.value = 'Student Violation Report';
				titleCell.font = { name: 'Calibri', size: 18, bold: true };
				titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

				const subtitleCell = sheet.getCell('A5');
				subtitleCell.value = `Generated: ${new Date().toLocaleString()}`;
				subtitleCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF4B5563' } };
				subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

				const headerRowNumber = 6;
				const headerRow = sheet.getRow(headerRowNumber);
				headerRow.values = Object.keys(sheetData[0]);
				headerRow.height = 24;

				headerRow.eachCell((cell) => {
					cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'FF0F172A' },
					};
					cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
					cell.border = {
						top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
					};
				});

				const dataRowStart = 7;
				sheetData.forEach((row, index) => {
					const excelRow = sheet.getRow(dataRowStart + index);
					excelRow.values = Object.values(row);
					excelRow.height = 28;

					excelRow.eachCell((cell) => {
						cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F2937' } };
						cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
						cell.border = {
							top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						};
					});
				});
			} else {
				// Fallback if header image not available
				sheet.mergeCells('A1:F3');
				sheet.mergeCells('A4:F4');
				sheet.mergeCells('A5:F5');
				sheet.getRow(1).height = 26;
				sheet.getRow(2).height = 26;
				sheet.getRow(3).height = 26;
				sheet.getRow(4).height = 28;
				sheet.getRow(5).height = 18;
				const titleCell = sheet.getCell('A4');
				titleCell.value = 'Student Violation Report';
				titleCell.font = { name: 'Calibri', size: 18, bold: true };
				titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

				const subtitleCell = sheet.getCell('A5');
				subtitleCell.value = `Generated: ${new Date().toLocaleString()}`;
				subtitleCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF4B5563' } };
				subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

				sheet.addRow([]);
				const headerRow = sheet.addRow(Object.keys(sheetData[0]));
				headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
				headerRow.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
				headerRow.eachCell((cell) => {
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'FF0F172A' },
					};
					cell.border = {
						top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
					};
				});

				sheetData.forEach((row) => {
					const excelRow = sheet.addRow(Object.values(row));
					excelRow.height = 28;
					excelRow.eachCell((cell) => {
						cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F2937' } };
						cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
						cell.border = {
							top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						};
					});
				});
			}

			const buffer = await workbook.xlsx.writeBuffer();
			const blob = new Blob([buffer], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', filename);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Excel export failed', error);
			alert('Unable to generate Excel download.');
		}
		return;
	}

	if (format === 'pdf') {
		try {
			const [{ jsPDF }, { default: autoTable }, headerImage] = await Promise.all([
				import('jspdf'),
				import('jspdf-autotable'),
				resolveHeaderImage(),
			]);
			const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
			const pageWidth = doc.internal.pageSize.getWidth();
			const tableMarginLeft = 10;
			const tableMarginRight = 10;
			const tableWidth = pageWidth - tableMarginLeft - tableMarginRight;
			const tableCenterX = tableMarginLeft + tableWidth / 2;
			let startY = 22;

			// Add header image if available
			if (headerImage.dataUrl && headerImage.dimensions) {
				const headerWidth = tableWidth;
				const headerHeight = (headerImage.dimensions.height * headerWidth) / headerImage.dimensions.width;
				const headerX = tableMarginLeft;
				doc.addImage(headerImage.dataUrl, 'PNG', headerX, 8, headerWidth, headerHeight);
				startY = 8 + headerHeight + 8;
			}

			doc.setFont('helvetica', 'bold');
			doc.setFontSize(13);
			doc.text('Student Violation Report', tableCenterX, startY, { align: 'center' });
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(9);
			doc.text(`Generated: ${new Date().toLocaleString()}`, tableCenterX, startY + 5, { align: 'center' });

			autoTable(doc, {
				startY: startY + 9,
				head: [[ 'Date', 'Violation', 'Type', 'Reported by', 'Remarks', 'Status' ]],
				body: [
					[
						formatDisplayDate(record.createdAtRaw || record.date),
						record.violation || record.violation_label || record.violation_name || '-',
						record.type || normalizeType(record),
						record.reportedBy || record.reported_by || '-',
						record.remarks || '-',
						record.status || (record.cleared_at ? 'Cleared' : 'Active') || '-',
					],
				],
				theme: 'grid',
				styles: {
					fontSize: 9,
					cellPadding: 2.5,
					textColor: [31, 41, 55],
					halign: 'left',
					valign: 'middle',
				},
				headStyles: {
					fillColor: [15, 23, 42],
					textColor: [255, 255, 255],
					fontStyle: 'bold',
				},
				alternateRowStyles: {
					fillColor: [248, 250, 252],
				},
				margin: { left: tableMarginLeft, right: tableMarginRight },
			});

			doc.save(filename);
		} catch (error) {
			console.error('PDF export failed', error);
			alert('Unable to generate PDF download.');
		}
	}
}, [formatDownloadFileName, getStudentInfo, resolveHeaderImage]);

	const triggerDownloadModal = useCallback((record) => {
		setSelectedDownloadRecord(record);
		setDownloadFormat('excel');
		setDownloadModalOpen(true);
	}, []);

	const confirmDownload = useCallback(() => {
		if (!selectedDownloadRecord) return;
		createDownload(selectedDownloadRecord, downloadFormat);
		setDownloadModalOpen(false);
	}, [createDownload, downloadFormat, selectedDownloadRecord]);

	const createDownloadAll = useCallback(async (format) => {
		if (!records || records.length === 0) {
			alert('No violations to download.');
			return;
		}

		const studentInfo = getStudentInfo();

		// Get the first record to extract violation information (if needed)
		const firstRecord = records[0];
		const sheetData = records.map((record) => ({
			Date: formatDisplayDate(record.created_at || record.date),
			Violation: record.violation_label || record.violation_name || '-',
			Type: normalizeType(record),
			'Reported by': record.reported_by || '-',
			Remarks: record.remarks || '-',
			Status: record.cleared_at ? 'Cleared' : 'Active' || '-',
		}));

		const filename = formatDownloadFileName(firstRecord, format, true, studentInfo);

		if (format === 'excel') {
			try {
				const [{ Workbook }, { dataUrl, dimensions }] = await Promise.all([
					import('exceljs'),
					resolveHeaderImage(),
				]);
				const workbook = new Workbook();
				const sheet = workbook.addWorksheet('All Violations', {
					views: [{ state: 'frozen', ySplit: 6 }],
				});

				sheet.columns = [
					{ key: 'Date', width: 18 },
					{ key: 'Violation', width: 40 },
					{ key: 'Type', width: 24 },
					{ key: 'Reported by', width: 20 },
					{ key: 'Remarks', width: 44 },
					{ key: 'Status', width: 16 },
				];

			sheet.mergeCells('A1:F3');
			sheet.mergeCells('A4:F4');
			sheet.mergeCells('A5:F5');
			sheet.getRow(1).height = 26;
			sheet.getRow(2).height = 26;
			sheet.getRow(3).height = 26;
			sheet.getRow(4).height = 28;
			sheet.getRow(5).height = 18;

			// Add header image if available
			if (dataUrl && dimensions) {
				const headerRegionWidthPx = sheet.columns.reduce(
					(total, column) => total + (Number(column.width || 10) * 7.5),
					0,
				);
				const headerRegionHeightPx = [1, 2, 3].reduce(
					(total, rowNumber) => total + (Number(sheet.getRow(rowNumber).height || 15) * 1.333),
					0,
				);
				const imageScale = Math.min(
					(headerRegionWidthPx - 24) / dimensions.width,
					(headerRegionHeightPx - 6) / dimensions.height,
					1,
				);
				const imageWidthPx = Math.max(8, Math.round(dimensions.width * imageScale));
				const imageHeightPx = Math.max(8, Math.round(dimensions.height * imageScale));
				const leftOffsetPx = Math.max((headerRegionWidthPx - imageWidthPx) / 2, 0);
				const topOffsetPx = Math.max((headerRegionHeightPx - imageHeightPx) / 2, 0);

				const toColCoordinate = (pixelOffset) => {
					let remaining = pixelOffset;
					for (let colIndex = 0; colIndex < sheet.columns.length; colIndex += 1) {
						const colPx = Number(sheet.columns[colIndex]?.width || 10) * 7.5;
						if (remaining <= colPx) {
							return colIndex + remaining / colPx;
						}
						remaining -= colPx;
					}
					return sheet.columns.length - 1;
				};

				const toRowCoordinate = (pixelOffset) => {
					let remaining = pixelOffset;
					for (let rowIndex = 1; rowIndex <= 3; rowIndex += 1) {
						const rowPx = Number(sheet.getRow(rowIndex).height || 15) * 1.333;
						if (remaining <= rowPx) {
							return (rowIndex - 1) + remaining / rowPx;
						}
						remaining -= rowPx;
					}
					return 2;
				};

				const imageId = workbook.addImage({ base64: dataUrl, extension: 'png' });
				sheet.addImage(imageId, {
					tl: {
						col: toColCoordinate(leftOffsetPx),
						row: toRowCoordinate(topOffsetPx),
					},
					ext: {
						width: imageWidthPx,
						height: imageHeightPx,
					},
				});

				const titleCell = sheet.getCell('A4');
				titleCell.value = 'Student Violation Report - All Records';
				titleCell.font = { name: 'Calibri', size: 18, bold: true };
				titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

				const subtitleCell = sheet.getCell('A5');
				subtitleCell.value = `Generated: ${new Date().toLocaleString()}`;
				subtitleCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF4B5563' } };
				subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

				const headerRowNumber = 6;
				const headerRow = sheet.getRow(headerRowNumber);
				headerRow.values = Object.keys(sheetData[0]);
				headerRow.height = 24;

				headerRow.eachCell((cell) => {
					cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'FF0F172A' },
					};
					cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
					cell.border = {
						top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
					};
				});

				const dataRowStart = 7;
				sheetData.forEach((row, index) => {
					const excelRow = sheet.getRow(dataRowStart + index);
					excelRow.values = Object.values(row);
					excelRow.height = 28;

					const shouldAlternate = index % 2 === 1;
					excelRow.eachCell((cell) => {
						cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F2937' } };
						if (shouldAlternate) {
							cell.fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFF8FAFC' },
							};
						}
						cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
						cell.border = {
								top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
								left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
								bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
								right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							};
						});
					});
				} else {
					// Fallback if header image not available
					sheet.mergeCells('A1:F3');
					sheet.mergeCells('A4:F4');
					sheet.mergeCells('A5:F5');
					sheet.getRow(1).height = 26;
					sheet.getRow(2).height = 26;
					sheet.getRow(3).height = 26;
					sheet.getRow(4).height = 28;
					sheet.getRow(5).height = 18;
					const titleCell = sheet.getCell('A4');
					titleCell.value = 'Student Violation Report - All Records';
					titleCell.font = { name: 'Calibri', size: 18, bold: true };
					titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

					const subtitleCell = sheet.getCell('A5');
					subtitleCell.value = `Generated: ${new Date().toLocaleString()}`;
					subtitleCell.font = { name: 'Calibri', size: 11, color: { argb: 'FF4B5563' } };
					subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

					sheet.addRow([]);
					const headerRow = sheet.addRow(Object.keys(sheetData[0]));
					headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
					headerRow.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
					headerRow.eachCell((cell) => {
						cell.fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FF0F172A' },
						};
						cell.border = {
							top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						};
					});

					sheetData.forEach((row, index) => {
						const excelRow = sheet.addRow(Object.values(row));
						excelRow.height = 28;
						excelRow.eachCell((cell) => {
							cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F2937' } };
							cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
							cell.border = {
								top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
								left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
								bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
								right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							};
							if (index % 2 === 0) {
								cell.fill = {
									type: 'pattern',
									pattern: 'solid',
									fgColor: { argb: 'FFF8FAFC' },
								};
							}
						});
					});
				}

				const buffer = await workbook.xlsx.writeBuffer();
				const blob = new Blob([buffer], {
					type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				});
				const url = URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = url;
				link.setAttribute('download', filename);
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			} catch (error) {
				console.error('Excel export failed', error);
				alert('Unable to generate Excel download.');
			}
			return;
		}

		if (format === 'pdf') {
			try {
				const [{ jsPDF }, { default: autoTable }, headerImage] = await Promise.all([
					import('jspdf'),
					import('jspdf-autotable'),
					resolveHeaderImage(),
				]);
				const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
				const pageWidth = doc.internal.pageSize.getWidth();
				const tableMarginLeft = 10;
				const tableMarginRight = 10;
				const tableWidth = pageWidth - tableMarginLeft - tableMarginRight;
				const tableCenterX = tableMarginLeft + tableWidth / 2;
				let startY = 22;

				// Add header image if available
				if (headerImage.dataUrl && headerImage.dimensions) {
					const headerWidth = tableWidth;
					const headerHeight = (headerImage.dimensions.height * headerWidth) / headerImage.dimensions.width;
					const headerX = tableMarginLeft;
					doc.addImage(headerImage.dataUrl, 'PNG', headerX, 8, headerWidth, headerHeight);
					startY = 8 + headerHeight + 8;
				}

				doc.setFont('helvetica', 'bold');
				doc.setFontSize(13);
				doc.text('Student Violation Report - All Records', tableCenterX, startY, { align: 'center' });
				doc.setFont('helvetica', 'normal');
				doc.setFontSize(9);
				doc.text(`Generated: ${new Date().toLocaleString()}`, tableCenterX, startY + 5, { align: 'center' });

				const body = records.map((record) => [
					formatDisplayDate(record.created_at || record.date),
					record.violation_label || record.violation_name || '-',
					normalizeType(record),
					record.reported_by || '-',
					record.remarks || '-',
					record.cleared_at ? 'Cleared' : 'Active' || '-',
				]);

				autoTable(doc, {
					startY: startY + 9,
					head: [['Date', 'Violation', 'Type', 'Reported by', 'Remarks', 'Status']],
					body: body,
					theme: 'grid',
					styles: {
						fontSize: 9,
						cellPadding: 2.5,
						textColor: [31, 41, 55],
						halign: 'left',
						valign: 'middle',
					},
					headStyles: {
						fillColor: [15, 23, 42],
						textColor: [255, 255, 255],
						fontStyle: 'bold',
					},
					alternateRowStyles: {
						fillColor: [248, 250, 252],
					},
					margin: { left: tableMarginLeft, right: tableMarginRight },
				});

				doc.save(filename);
			} catch (error) {
				console.error('PDF export failed', error);
				alert('Unable to generate PDF download.');
			}
		}
	}, [records, formatDownloadFileName, getStudentInfo, resolveHeaderImage, formatDisplayDate, normalizeType]);

	const triggerDownloadAllModal = useCallback(() => {
		setDownloadAllFormat('excel');
		setDownloadAllModalOpen(true);
	}, []);

	const confirmDownloadAll = useCallback(() => {
		createDownloadAll(downloadAllFormat);
		setDownloadAllModalOpen(false);
	}, [createDownloadAll, downloadAllFormat]);

	const columns = useMemo(
		() => [
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
			{
				key: 'download',
				label: '',
				width: 'w-32',
				align: 'center',
				renderHeader: () => (
					<div className="flex items-center justify-center gap-1.5">
						<button
							type="button"
							className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								triggerDownloadAllModal();
							}}
							aria-label="Download all violations"
							title="Download all violations"
						>
							<Download className="w-4 h-4" />
						</button>
					</div>
				),
				render: (_value, row) => (
					<button
						type="button"
						className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
						onClick={(e) => {
							e.stopPropagation();
							triggerDownloadModal(row);
						}}
						aria-label="Download violation"
						title="Download this violation"
					>
						<Download className="w-4 h-4" />
					</button>
				),
			},
		],
		[triggerDownloadModal, triggerDownloadAllModal],
	);

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
					student_last_name: row.student_last_name || row.last_name || row.surname || '',
					student_first_name: row.student_first_name || row.first_name || row.given_name || '',
					createdAtRaw: row.created_at || row.date || new Date().toISOString(),
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
							<div className="relative">
								<select
									value={statusFilter}
									onChange={(e) => setStatusFilter(e.target.value)}
									className="appearance-none rounded-lg border border-gray-500/30 bg-[#1a1a1a] px-3 py-2 pr-8 text-sm text-white outline-none focus:border-cyan-400"
								>
									<option value="All">All</option>
									<option value="Active">Active</option>
									<option value="Cleared">Cleared</option>
								</select>
								<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
									<Filter className="w-4 h-4 text-gray-400" />
								</div>
							</div>
						</div>
					</div>{isLoading && !hasLoadedOnce ? (
						<div className="text-center text-gray-400 py-8">Loading violations...</div>
					) : (
						<>
							{error ? (
								<div className="mb-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
									{error}
								</div>
							) : null}
							<DataTable columns={columns} data={tableData} className="mt-2" />							<Modal
								isOpen={downloadModalOpen}
								onClose={() => setDownloadModalOpen(false)}
								title="Download Violation Record"
								size="sm"
							>
								<div className="space-y-3">
									<p className="text-sm text-gray-200">Choose download format for:</p>
									<p className="text-sm font-semibold text-white">
										{selectedDownloadRecord?.violation ?? 'No violation selected'}
									</p>
									<select
										value={downloadFormat}
										onChange={(e) => setDownloadFormat(e.target.value)}
										className="w-full rounded-lg border border-gray-500/30 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
									>
										<option value="excel">Excel</option>
										<option value="pdf">PDF</option>
									</select>
								</div>
								<ModalFooter>
									<button
										type="button"
										className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
										onClick={() => setDownloadModalOpen(false)}
									>
										Cancel
									</button>
									<button
										type="button"
										className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
										onClick={confirmDownload}
									>
										Download
									</button>
								</ModalFooter>
							</Modal>

							<Modal
								isOpen={downloadAllModalOpen}
								onClose={() => setDownloadAllModalOpen(false)}
								title="Download All Violations"
								size="sm"
							>
								<div className="space-y-3">
									<p className="text-sm text-gray-200">Download all violation records in:</p>
									<select
										value={downloadAllFormat}
										onChange={(e) => setDownloadAllFormat(e.target.value)}
										className="w-full rounded-lg border border-gray-500/30 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
									>
										<option value="excel">Excel</option>
										<option value="pdf">PDF</option>
									</select>
								</div>
								<ModalFooter>
									<button
										type="button"
										className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
										onClick={() => setDownloadAllModalOpen(false)}
									>
										Cancel
									</button>
									<button
										type="button"
										className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
										onClick={confirmDownloadAll}
									>
										Download All
									</button>
								</ModalFooter>
							</Modal>						</>
					)}
				</Card>
			</div>
		</AnimatedContent>
	);
};

export default StudentViolations;




