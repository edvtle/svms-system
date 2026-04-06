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

// Convert signature image to base64 data URL for exports
const getSignatureImageData = async (signatureSrc) => {
	if (!signatureSrc) return null;

	try {
		// If it's already a data URL, return it
		if (signatureSrc.startsWith('data:')) {
			return signatureSrc;
		}

		// If it's a regular URL, fetch it
		const response = await fetch(signatureSrc);
		if (!response.ok) return null;

		const blob = await response.blob();
		return await blobToDataUrl(blob);
	} catch (error) {
		console.warn('Failed to load signature image:', error);
		return null;
	}
};

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
			
			// Construct full year-section format (e.g., "BSIT-3B")
			let yearSection = user?.yearSection || user?.year_section || '';
			
			// If yearSection doesn't contain course info, try to construct it
			if (yearSection && !yearSection.includes('-')) {
				const course = user?.course || user?.program || user?.course_code || 'BSIT';
				yearSection = `${course}-${yearSection}`;
			}
			
			return {
				lastName: user?.lastName || user?.last_name || '',
				firstName: user?.firstName || user?.first_name || '',
				yearSection: yearSection,
				schoolId: user?.schoolId || user?.school_id || user?.schoolId || '',
			};
		} catch (_error) {
			return { lastName: '', firstName: '', yearSection: '', schoolId: '' };
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

	const normalizeStudentNumber = (value) => {
		const raw = String(value || '').trim();
		if (!raw || /^unknown$/i.test(raw) || /^n\/a$/i.test(raw) || /^na$/i.test(raw) || /^blank$/i.test(raw)) {
			return '';
		}
		return raw;
	};

	const studentNo = normalizeStudentNumber(
		studentInfo.schoolId,
	);

	const filename = formatDownloadFileName(record, format, false, studentInfo);

	if (format === 'excel') {
    try {
        const signatureSrc = record.signature || record.signature_image || record.signatureImage || '';
        const [signatureImageData, { Workbook }, headerImage] = await Promise.all([
            getSignatureImageData(signatureSrc),
            import('exceljs'),
            resolveHeaderImage(),
        ]);

        const workbook = new Workbook();
        const sheet = workbook.addWorksheet('Violation Slip');

        sheet.pageSetup = {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            horizontalCentered: true,
        };

        sheet.columns = [
            { width: 3 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 18 },
            { width: 3 },
        ];

        sheet.getRow(1).height = 18;
        sheet.getRow(2).height = 18;
        sheet.getRow(3).height = 18;
        sheet.getRow(4).height = 18;
        sheet.getRow(5).height = 18;
        sheet.getRow(6).height = 18;
        sheet.getRow(7).height = 18;
        sheet.getRow(8).height = 28;
        sheet.getRow(9).height = 20;
        sheet.getRow(10).height = 16;
        sheet.getRow(11).height = 18;
        sheet.getRow(12).height = 18;
        sheet.getRow(13).height = 18;
        sheet.getRow(14).height = 18;
        sheet.getRow(15).height = 18;
        sheet.getRow(16).height = 22;
        sheet.getRow(17).height = 24;
        sheet.getRow(18).height = 8;
        sheet.getRow(19).height = 18;
        sheet.getRow(20).height = 24;
        sheet.getRow(21).height = 24;
        sheet.getRow(22).height = 8;
        sheet.getRow(23).height = 28;
        sheet.getRow(24).height = 18;
        sheet.getRow(25).height = 18;
        sheet.getRow(26).height = 10;
        sheet.getRow(27).height = 10;
        sheet.getRow(28).height = 18;
        sheet.getRow(29).height = 18;
        sheet.getRow(30).height = 18;
        sheet.getRow(31).height = 18;

        sheet.mergeCells('B1:H5');
        if (headerImage.dataUrl && headerImage.dimensions) {
            const headerId = workbook.addImage({ base64: headerImage.dataUrl, extension: 'png' });
            sheet.addImage(headerId, {
                tl: { col: 1, row: 0 },
                br: { col: 8, row: 6 },
            });
        }

        sheet.mergeCells('B8:H8');
        const titleCell = sheet.getCell('B8');
        titleCell.value = 'NON-COMPLIANCE SLIP (NCS)';
        titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF000000' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        sheet.mergeCells('B9:H9');
        const subtitleCell = sheet.getCell('B9');
        subtitleCell.value = 'Student Violation Report';
        subtitleCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF4B5563' } };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const violationText = record.violation || record.violation_label || record.violation_name || '-';
        const remarksText = record.remarks || '-';
        const reportedBy = record.reportedBy || record.reported_by || '-';
        const programYearSection = studentInfo.yearSection || '';
        const studentName = `${studentInfo.lastName.charAt(0).toUpperCase() + studentInfo.lastName.slice(1).toLowerCase()}, ${studentInfo.firstName.charAt(0).toUpperCase() + studentInfo.firstName.slice(1).toLowerCase()}`.trim();

        sheet.mergeCells('B11:D11');
        sheet.getCell('B11').value = {
            richText: [
                { text: 'Date: ', font: { name: 'Calibri', size: 11, bold: true } },
                { text: formatDisplayDate(record.createdAtRaw || record.date), font: { name: 'Calibri', size: 11 } },
            ],
        };
        sheet.getCell('B11').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        sheet.mergeCells('E11:H11');
        sheet.getCell('E11').value = {
            richText: [
                { text: 'Student No: ', font: { name: 'Calibri', size: 11, bold: true } },
                { text: studentNo, font: { name: 'Calibri', size: 11 } },
            ],
        };
        sheet.getCell('E11').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        sheet.mergeCells('B12:H12');
        sheet.getCell('B12').value = {
            richText: [
                { text: 'Name of Student: ', font: { name: 'Calibri', size: 11, bold: true } },
                { text: studentName, font: { name: 'Calibri', size: 11 } },
            ],
        };
        sheet.getCell('B12').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        sheet.mergeCells('B13:H13');
        sheet.getCell('B13').value = {
            richText: [
                { text: 'Program/Year & Sec.: ', font: { name: 'Calibri', size: 11, bold: true } },
                { text: programYearSection, font: { name: 'Calibri', size: 11 } },
            ],
        };
        sheet.getCell('B13').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        sheet.mergeCells('B15:H15');
        sheet.getCell('B15').value = 'Violation:';
        sheet.getCell('B15').font = { name: 'Calibri', size: 11, bold: true };
        sheet.getCell('B15').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        sheet.mergeCells('B16:H17');
        sheet.getCell('B16').value = violationText;
        sheet.getCell('B16').font = { name: 'Calibri', size: 11 };
        sheet.getCell('B16').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

        sheet.mergeCells('B19:H19');
        sheet.getCell('B19').value = 'Remarks:';
        sheet.getCell('B19').font = { name: 'Calibri', size: 11, bold: true };
        sheet.getCell('B19').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        sheet.mergeCells('B20:H21');
        sheet.getCell('B20').value = remarksText;
        sheet.getCell('B20').font = { name: 'Calibri', size: 11 };
        sheet.getCell('B20').alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

        sheet.mergeCells('B23:D23');
        sheet.getCell('B23').value = 'Conforme:';
        sheet.getCell('B23').font = { name: 'Calibri', size: 11, bold: true };
        sheet.getCell('B23').alignment = { horizontal: 'left', vertical: 'middle' };

        sheet.mergeCells('E23:H23');
        sheet.getCell('E23').value = 'Personnel In-Charge:';
        sheet.getCell('E23').font = { name: 'Calibri', size: 11, bold: true };
        sheet.getCell('E23').alignment = { horizontal: 'left', vertical: 'middle' };

        sheet.mergeCells('B24:D24');
        if (signatureImageData) {
            const signatureImageId = workbook.addImage({ base64: signatureImageData, extension: 'png' });
            sheet.addImage(signatureImageId, {
                tl: { col: 1.1, row: 23.3 },
                ext: { width: 80, height: 18 },
            });
        } else {
            sheet.getCell('B24').value = '[ATTACHED SIGNATURE]';
            sheet.getCell('B24').font = { name: 'Calibri', size: 10 };
            sheet.getCell('B24').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }

        sheet.mergeCells('E24:H24');
        sheet.getCell('E24').value = reportedBy || '[NAME OF REPORTED BY]';
        sheet.getCell('E24').font = { name: 'Calibri', size: 11, bold: true, underline: 'single' };
        sheet.getCell('E24').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        sheet.mergeCells('B25:D25');
        sheet.getCell('B25').value = 'Student Signature';
        sheet.getCell('B25').font = { name: 'Calibri', size: 10 };
        sheet.getCell('B25').alignment = { horizontal: 'left', vertical: 'middle' };

        sheet.mergeCells('E25:H25');
        sheet.getCell('E25').value = 'Printed Name';
        sheet.getCell('E25').font = { name: 'Calibri', size: 10 };
        sheet.getCell('E25').alignment = { horizontal: 'left', vertical: 'middle' };

        sheet.mergeCells('B28:H28');
        sheet.getCell('B28').value = ' STUDENT COPY';
        sheet.getCell('B28').font = { name: 'Calibri', size: 10, bold: true };
        sheet.getCell('B28').alignment = { horizontal: 'left', vertical: 'middle' };

        sheet.mergeCells('B29:H29');
        sheet.getCell('B29').value = ' (Please coordinate in the SSO within 2-3 working days, else sanction will be given)';
        sheet.getCell('B29').font = { name: 'Calibri', size: 9 };
        sheet.getCell('B29').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        for (let rowIndex = 9; rowIndex <= 29; rowIndex += 1) {
            sheet.getRow(rowIndex).eachCell((cell) => {
                if (!cell.font) cell.font = {};
                cell.font = { ...cell.font, name: 'Calibri', size: 11, color: { argb: 'FF1F2937' } };
            });
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
        const signatureSrc = record.signature || record.signature_image || record.signatureImage || '';
        const [signatureImageData, { jsPDF }, headerImage] = await Promise.all([
            getSignatureImageData(signatureSrc),
            import('jspdf'),
            resolveHeaderImage(),
        ]);

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - margin * 2;
        let cursorY = 10;

        if (headerImage.dataUrl && headerImage.dimensions) {
            const imageScale = Math.min(1, contentWidth / headerImage.dimensions.width);
            const headerWidth = headerImage.dimensions.width * imageScale;
            const headerHeight = Math.min(headerImage.dimensions.height * imageScale, 50);
            const headerX = margin + (contentWidth - headerWidth) / 2;
            doc.addImage(headerImage.dataUrl, 'PNG', headerX, cursorY, headerWidth, headerHeight);
            cursorY += headerHeight + 8;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('NON-COMPLIANCE SLIP (NCS)', pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 10;
        doc.setFontSize(12);
        doc.text('Student Violation Report', pageWidth / 2, cursorY, { align: 'center' });
        cursorY += 12;

        const violationText = record.violation || record.violation_label || record.violation_name || '-';
        const remarksText = record.remarks || '-';
        const reportedBy = record.reportedBy || record.reported_by || '-';
        const programYearSection = studentInfo.yearSection || '';
        const studentName = `${studentInfo.lastName.charAt(0).toUpperCase() + studentInfo.lastName.slice(1).toLowerCase()}, ${studentInfo.firstName.charAt(0).toUpperCase() + studentInfo.firstName.slice(1).toLowerCase()}`.trim();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Date:', margin, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDisplayDate(record.createdAtRaw || record.date), margin + 18, cursorY);

        doc.setFont('helvetica', 'bold');
        const studentNoLabel = 'Student No:';
        doc.text(studentNoLabel, pageWidth - margin - doc.getTextWidth(studentNo) - 24, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(studentNo, pageWidth - margin, cursorY, { align: 'right' });
        cursorY += 7;

        doc.setFont('helvetica', 'bold');
        doc.text('Name of Student:', margin, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(studentName, margin + 42, cursorY, { maxWidth: contentWidth - 42 });
        cursorY += 7;

        doc.setFont('helvetica', 'bold');
        doc.text('Program/Year & Sec.:', margin, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.text(programYearSection, margin + 60, cursorY, { maxWidth: contentWidth - 60 });
        cursorY += 14;

        doc.setFont('helvetica', 'bold');
        doc.text('Violation:', margin, cursorY);
        doc.setFont('helvetica', 'normal');
        cursorY += 6;
        const violationLines = doc.splitTextToSize(violationText, contentWidth);
        doc.text(violationLines, margin, cursorY);
        cursorY += violationLines.length * 5 + 6;

        doc.setFont('helvetica', 'bold');
        doc.text('Remarks:', margin, cursorY);
        doc.setFont('helvetica', 'normal');
        cursorY += 6;
        const remarksLines = doc.splitTextToSize(remarksText, contentWidth);
        doc.text(remarksLines, margin, cursorY);
        cursorY += remarksLines.length * 5 + 12;

        const leftColX = margin;
        const rightColX = pageWidth / 2 + 2;
        const colWidth = contentWidth / 2 - 4;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Conforme:', leftColX, cursorY);
        doc.text('Personnel In-Charge:', rightColX, cursorY);
        cursorY += 6;

        const signatureHeight = 20;
        const signatureWidth = 65;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        if (signatureImageData) {
            doc.addImage(signatureImageData, 'PNG', leftColX, cursorY, signatureWidth, signatureHeight);
        } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.text('[ATTACHED SIGNATURE]', leftColX + signatureWidth / 2, cursorY + signatureHeight / 2, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
        }

        const signatureLabelY = cursorY + signatureHeight + 8;
        doc.setFont('helvetica', 'bold');
        const reportedByText = reportedBy || '[NAME OF REPORTED BY]';
        const reportedByY = signatureLabelY - 6;
        doc.text(reportedByText, rightColX, reportedByY, { maxWidth: colWidth });
        const reportedByWidth = doc.getTextWidth(reportedByText);
        const underlineY = reportedByY + 2;
        doc.line(rightColX, underlineY, rightColX + reportedByWidth, underlineY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Student Signature', leftColX, signatureLabelY);
        doc.text('Printed Name', rightColX, signatureLabelY);

        const footerY = pageHeight - 24;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('STUDENT COPY', pageWidth - margin, footerY, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        const disclaimerLines = doc.splitTextToSize('(Please coordinate in the SSO within 2-3 working days, else sanction will be given)', contentWidth / 2);
        doc.text(disclaimerLines, pageWidth - margin, footerY + 4, { align: 'right' });

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
		const sheetData = records.map((record, index) => ({
			No: index + 1,
			Date: formatDisplayDate(record.created_at || record.date),
			Violation: record.violation_label || record.violation_name || '-',
			'Reported by': record.reported_by || '-',
			Remarks: record.remarks || '-',
			Signature: record.signature || record.signature_image || record.signatureImage || '',
			Status: record.cleared_at ? 'Cleared' : 'Active' || '-',
		}));

		const filename = formatDownloadFileName(firstRecord, format, true, studentInfo);

		if (format === 'excel') {
			try {
				// Process signature images for all records
				const signaturePromises = records.map(record => 
					getSignatureImageData(record.signature || record.signature_image || record.signatureImage || '')
				);
				const signatureImages = await Promise.all(signaturePromises);
				
				const [{ Workbook }, { dataUrl, dimensions }] = await Promise.all([
					import('exceljs'),
					resolveHeaderImage(),
				]);
				const workbook = new Workbook();
				const sheet = workbook.addWorksheet('All Violations', {
					views: [{ state: 'frozen', ySplit: 6 }],
				});

				sheet.columns = [
					{ key: 'No', width: 10 },
					{ key: 'Date', width: 18 },
					{ key: 'Violation', width: 40 },
					{ key: 'Reported by', width: 24 },
					{ key: 'Remarks', width: 44 },
					{ key: 'Signature', width: 22 },
					{ key: 'Status', width: 16 },
				];

		sheet.mergeCells('C1:E3');
		sheet.mergeCells('C4:E4');
		sheet.mergeCells('C5:E5');
		sheet.pageSetup = {
			orientation: 'landscape',
			fitToPage: true,
			fitToWidth: 1,
			fitToHeight: 1,
		};
		sheet.getRow(1).height = 40;
		sheet.getRow(2).height = 40;
		sheet.getRow(3).height = 40;
		sheet.getRow(4).height = 35;
		sheet.getRow(5).height = 28;

		// Add header image if available
		if (dataUrl && dimensions) {
			const headerRegionWidthPx = [3, 4, 5].reduce(
				(total, colIndex) => total + (Number(sheet.getColumn(colIndex).width || 10) * 7.5),
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
			const leftOffsetPx = (headerRegionWidthPx - imageWidthPx) / 2;
			const topOffsetPx = (headerRegionHeightPx - imageHeightPx) / 2;

			// Calculate exact column and row positions with better precision
			const toColCoordinate = (pixelOffset) => {
				let colIndex = 0;
				let accumulatedPx = 0;
					for (let i = 3; i <= 5; i += 1) {
						const colWidth = sheet.getColumn(i).width || 15;
						const colPx = colWidth * 7.5;
						if (accumulatedPx + colPx >= pixelOffset) {
							const offsetInCol = pixelOffset - accumulatedPx;
							return (i - 1) + (offsetInCol / colPx);
						}
						accumulatedPx += colPx;
						colIndex = i;
					}
					return colIndex - 1;
				};

				const toRowCoordinate = (pixelOffset) => {
					let rowIndex = 0;
					let accumulatedPx = 0;
					for (let i = 1; i <= 3; i += 1) {
						const rowPx = Number(sheet.getRow(i).height || 15) * 1.333;
						if (accumulatedPx + rowPx >= pixelOffset) {
							const offsetInRow = pixelOffset - accumulatedPx;
							return (i - 1) + (offsetInRow / rowPx);
						}
						accumulatedPx += rowPx;
						rowIndex = i;
					}
					return rowIndex - 1;
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

const titleCell = sheet.getCell('C4');
			titleCell.value = 'STUDENT VIOLATION REPORT';
			titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF000000' } };
			titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

		const subtitleCell = sheet.getCell('C5');
			const generatedDateRaw = new Date();
			const month = generatedDateRaw.toLocaleString(undefined, { month: 'long' });
			const day = generatedDateRaw.getDate();
			const year = generatedDateRaw.getFullYear();
			const time = generatedDateRaw.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
			subtitleCell.value = `Generated: ${month} ${day}, ${year}, ${time}`;
			subtitleCell.font = { name: 'Calibri', size: 12, color: { argb: 'FF4B5563' } };
			subtitleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

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
					cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
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
					excelRow.eachCell((cell, cellNum) => {
						cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F2937' } };
						if (shouldAlternate) {
							cell.fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFF8FAFC' },
							};
						}
						// Center align No and Signature columns
						if ([1, 6].includes(cellNum)) {
							cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
						} else {
							cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
						}
						cell.border = {
							top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						};
					});

					// Add signature image if available for this row
					if (signatureImages[index]) {
						const signatureImageId = workbook.addImage({ base64: signatureImages[index], extension: 'png' });
						const signatureColIndex = 6; // Column F (0-indexed as 5, but 1-indexed as 6)
						const signatureRowIndex = dataRowStart + index;

						// Calculate position for signature image (centered in the cell)
						const colWidthPx = sheet.getColumn(signatureColIndex).width * 7.5;
						const rowHeightPx = sheet.getRow(signatureRowIndex).height * 1.333;

						// Scale signature to fit in cell (max 80% of cell size)
						const maxWidth = colWidthPx * 0.8;
						const maxHeight = rowHeightPx * 0.8;

						// For now, use fixed size that fits well in the cell
						const sigWidth = Math.min(maxWidth, 80);
						const sigHeight = Math.min(maxHeight, 24);

						const sigLeftOffset = (colWidthPx - sigWidth) / 2;
						const sigTopOffset = (rowHeightPx - sigHeight) / 2;

						const toColCoordinateForSig = (pixelOffset) => {
							let remaining = pixelOffset;
							const colWidth = sheet.getColumn(signatureColIndex).width || 15;
							const colPx = colWidth * 7.5;
							if (remaining <= colPx) {
								return (signatureColIndex - 1) + remaining / colPx;
							}
							return signatureColIndex - 1;
						};

						const toRowCoordinateForSig = (pixelOffset) => {
							let remaining = pixelOffset;
							const rowPx = Number(sheet.getRow(signatureRowIndex).height || 15) * 1.333;
							if (remaining <= rowPx) {
								return (signatureRowIndex - 1) + remaining / rowPx;
							}
							return signatureRowIndex - 1;
						};

						sheet.addImage(signatureImageId, {
							tl: {
								col: toColCoordinateForSig(sigLeftOffset),
								row: toRowCoordinateForSig(sigTopOffset),
							},
							ext: {
								width: sigWidth,
								height: sigHeight,
							},
						});

						// Clear the text in the signature cell since we have an image
						const signatureCell = sheet.getCell(`${String.fromCharCode(65 + signatureColIndex - 1)}${signatureRowIndex}`);
						signatureCell.value = '';
					}
				});

				// Add footer with student name and year/section aligned with last table column
				const footerRowNumber = dataRowStart + sheetData.length + 2;
				const footerRow = sheet.getRow(footerRowNumber);
				footerRow.height = 32;
				
				// Merge only the last column (G) for centering
				sheet.mergeCells(`G${footerRowNumber}`);
				const studentNameCell = sheet.getCell(`G${footerRowNumber}`);
				studentNameCell.value = `${studentInfo.lastName.charAt(0).toUpperCase() + studentInfo.lastName.slice(1).toLowerCase()}, ${studentInfo.firstName.charAt(0).toUpperCase() + studentInfo.firstName.slice(1).toLowerCase()}`.trim();
				studentNameCell.font = { name: 'Calibri', size: 11, bold: true };
				studentNameCell.alignment = { horizontal: 'center', vertical: 'middle' };
				
				// Year/Section in footer (next row, also in last column)
				sheet.mergeCells(`G${footerRowNumber + 1}`);
				const yearSectionCell = sheet.getCell(`G${footerRowNumber + 1}`);
				yearSectionCell.value = studentInfo.yearSection || '';
				yearSectionCell.font = { name: 'Calibri', size: 11, bold: true };
				yearSectionCell.alignment = { horizontal: 'center', vertical: 'top' };
			} else {
				// Fallback if header image not available
sheet.mergeCells('C1:E3');
		sheet.mergeCells('C4:E4');
		sheet.mergeCells('C5:E5');
		sheet.getRow(1).height = 40;
		sheet.getRow(2).height = 40;
		sheet.getRow(3).height = 40;
		sheet.getRow(4).height = 35;
		sheet.getRow(5).height = 28;
		const titleCell = sheet.getCell('C4');
		titleCell.value = 'STUDENT VIOLATION REPORT';
		titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF000000' } };
		titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

		const subtitleCell = sheet.getCell('C5');
				const generatedDateRaw = new Date();
				const month = generatedDateRaw.toLocaleString(undefined, { month: 'long' });
				const day = generatedDateRaw.getDate();
				const year = generatedDateRaw.getFullYear();
				const time = generatedDateRaw.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
				subtitleCell.value = `Generated: ${month} ${day}, ${year}, ${time}`;
				subtitleCell.font = { name: 'Calibri', size: 12, color: { argb: 'FF4B5563' } };
				subtitleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

				sheet.addRow([]);
				const headerRow = sheet.addRow(Object.keys(sheetData[0]));
				headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
				headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
				headerRow.eachCell((cell) => {
					cell.fill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'FF0F172A' },
					};
					cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
					cell.border = {
						top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
					};
				});

				const currentRowNumber = sheet.lastRow?.number || 7;
				const dataRowStart = currentRowNumber + 1;
				sheetData.forEach((row, index) => {
					const excelRow = sheet.addRow(Object.values(row));
					excelRow.height = 28;
					const shouldAlternate = index % 2 === 1;
					excelRow.eachCell((cell, cellNum) => {
						cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1F2937' } };
						if (shouldAlternate) {
							cell.fill = {
								type: 'pattern',
								pattern: 'solid',
								fgColor: { argb: 'FFF8FAFC' },
							};
						}
						// Center align No and Signature columns
						if ([1, 6].includes(cellNum)) {
							cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
						} else {
							cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
						}
						cell.border = {
							top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
							right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
						};
					});

					// Add signature image if available for this row
					if (signatureImages[index]) {
						const signatureImageId = workbook.addImage({ base64: signatureImages[index], extension: 'png' });
						const signatureColIndex = 7; // Column G (0-indexed as 6, but 1-indexed as 7)
						const signatureRowIndex = currentRowNumber + 1 + index;

						// Calculate position for signature image (centered in the cell)
						const colWidthPx = sheet.getColumn(signatureColIndex).width * 7.5;
						const rowHeightPx = sheet.getRow(signatureRowIndex).height * 1.333;

						// Scale signature to fit in cell (max 80% of cell size)
						const maxWidth = colWidthPx * 0.8;
						const maxHeight = rowHeightPx * 0.8;

						// For now, use fixed size that fits well in the cell
						const sigWidth = Math.min(maxWidth, 80);
						const sigHeight = Math.min(maxHeight, 24);

						const sigLeftOffset = (colWidthPx - sigWidth) / 2;
						const sigTopOffset = (rowHeightPx - sigHeight) / 2;

						const toColCoordinateForSig = (pixelOffset) => {
							let remaining = pixelOffset;
							const colWidth = sheet.getColumn(signatureColIndex).width || 15;
							const colPx = colWidth * 7.5;
							if (remaining <= colPx) {
								return (signatureColIndex - 1) + remaining / colPx;
							}
							return signatureColIndex - 1;
						};

						const toRowCoordinateForSig = (pixelOffset) => {
							let remaining = pixelOffset;
							const rowPx = Number(sheet.getRow(signatureRowIndex).height || 15) * 1.333;
							if (remaining <= rowPx) {
								return (signatureRowIndex - 1) + remaining / rowPx;
							}
							return signatureRowIndex - 1;
						};

						sheet.addImage(signatureImageId, {
							tl: {
								col: toColCoordinateForSig(sigLeftOffset),
								row: toRowCoordinateForSig(sigTopOffset),
							},
							ext: {
								width: sigWidth,
								height: sigHeight,
							},
						});

						// Clear the text in the signature cell since we have an image
						const signatureCell = sheet.getCell(`${String.fromCharCode(65 + signatureColIndex - 1)}${signatureRowIndex}`);
						signatureCell.value = '';
					}
				});

				// Add footer with student name and year/section aligned with last table column
				const footerRowNumber = currentRowNumber + sheetData.length + 3;
				const footerRow = sheet.getRow(footerRowNumber);
				footerRow.height = 32;
				
				// Merge only the last column (G) for centering
				sheet.mergeCells(`G${footerRowNumber}`);
				const footerStudentNameCell = sheet.getCell(`G${footerRowNumber}`);
				footerStudentNameCell.value = `${studentInfo.lastName.charAt(0).toUpperCase() + studentInfo.lastName.slice(1).toLowerCase()}, ${studentInfo.firstName.charAt(0).toUpperCase() + studentInfo.firstName.slice(1).toLowerCase()}`.trim();
				footerStudentNameCell.font = { name: 'Calibri', size: 11, bold: true };
				footerStudentNameCell.alignment = { horizontal: 'center', vertical: 'middle' };
				
				// Year/Section in footer (next row, also in last column)
				sheet.mergeCells(`G${footerRowNumber + 1}`);
				const footerYearSectionCell = sheet.getCell(`G${footerRowNumber + 1}`);
				footerYearSectionCell.value = studentInfo.yearSection || '';
				footerYearSectionCell.font = { name: 'Calibri', size: 11, bold: true };
				footerYearSectionCell.alignment = { horizontal: 'center', vertical: 'top' };
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
		} else if (format === 'pdf') {
			try {
				// Process signature images for all records
				const signaturePromises = records.map(record => 
					getSignatureImageData(record.signature || record.signature_image || record.signatureImage || '')
				);
				const signatureImages = await Promise.all(signaturePromises);
				
				const [{ jsPDF }, { default: autoTable }, headerImage] = await Promise.all([
					import('jspdf'),
					import('jspdf-autotable'),
					resolveHeaderImage(),
				]);
				const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
				const pageWidth = doc.internal.pageSize.getWidth();
				const tableMarginLeft = 5;
				const tableMarginRight = 5;
				const tableWidth = pageWidth - tableMarginLeft - tableMarginRight;
				const tableCenterX = tableMarginLeft + tableWidth / 2;
			let startY = 20;

			// Add header image if available
			if (headerImage.dataUrl && headerImage.dimensions) {
				const headerWidth = tableWidth;
				const headerHeight = (headerImage.dimensions.height * headerWidth) / headerImage.dimensions.width;
				const headerX = tableMarginLeft;
				doc.addImage(headerImage.dataUrl, 'PNG', headerX, 10, headerWidth, headerHeight);
				startY = 10 + headerHeight + 8;
			}

			const generatedDateRaw = new Date();
			const month = generatedDateRaw.toLocaleString(undefined, { month: 'long' });
			const day = generatedDateRaw.getDate();
			const year = generatedDateRaw.getFullYear();
			const time = generatedDateRaw.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
			const generatedAt = `Generated: ${month} ${day}, ${year}, ${time}`;
			
			doc.setFont('helvetica', 'bold');
			doc.setFontSize(18);
			doc.text('STUDENT VIOLATION REPORT', tableCenterX, startY + 5, { align: 'center' });
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(11);
			doc.text(generatedAt, tableCenterX, startY + 13, { align: 'center' });

			// Add spacing after header before the table
			const tableStartY = startY + 20;
			const body = records.map((record, index) => [
				index + 1,
				formatDisplayDate(record.created_at || record.date),
				record.violation_label || record.violation_name || '-',
				record.reported_by || '-',
				record.remarks || '-',
				'', // Empty text for signature column since we'll add image
				record.cleared_at ? 'Cleared' : 'Active' || '-',
			]);
				const didDrawCell = (data) => {
					if (data.section === 'body' && data.column.index === 5 && signatureImages[data.row.index]) { // Signature column (0-indexed)
						const cellWidth = data.cell.width;
						const cellHeight = data.cell.height;
						const x = data.cell.x + 1;
						const y = data.cell.y + 1;

						// Scale signature to fit in cell
						const maxWidth = cellWidth - 2;
						const maxHeight = cellHeight - 2;
						const scale = Math.min(maxWidth / 80, maxHeight / 24, 1); // Assuming signature is ~80x24
						const sigWidth = 80 * scale;
						const sigHeight = 24 * scale;

						const sigX = x + (maxWidth - sigWidth) / 2;
						const sigY = y + (maxHeight - sigHeight) / 2;

						doc.addImage(signatureImages[data.row.index], 'PNG', sigX, sigY, sigWidth, sigHeight);
					}
				};

				autoTable(doc, {
					startY: tableStartY,
					head: [['No.', 'Date', 'Violation', 'Reported by', 'Remarks', 'Signature', 'Status']],
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
						halign: 'center',
					},
					alternateRowStyles: {
						fillColor: [248, 250, 252],
					},
					columnStyles: {
						0: { cellWidth: 16.5, halign: 'center' },
						1: { cellWidth: 30 },
						2: { cellWidth: 60 },
						3: { cellWidth: 27.5 },
						4: { cellWidth: 75 },
						5: { cellWidth: 30, halign: 'center' },
						6: { cellWidth: 40 },
					},
					margin: { left: tableMarginLeft, right: tableMarginRight },
					didDrawCell,
				});

				// Add footer with student name and year/section aligned with last table column
				const pageHeight = doc.internal.pageSize.getHeight();
				const footerY = pageHeight - 15;
				
				// Calculate the position of the last column (Status column)
				const columnWidths = [16.5, 30, 60, 27.5, 75, 30, 40]; // Column widths in mm
				const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
				const lastColumnStart = tableMarginLeft + totalTableWidth - columnWidths[columnWidths.length - 1];
				const lastColumnEnd = tableMarginLeft + totalTableWidth;
				
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(10);
				const studentName = `${studentInfo.lastName.toUpperCase()}, ${studentInfo.firstName.toUpperCase()}`.trim();
				const lastColumnCenter = lastColumnStart + (columnWidths[columnWidths.length - 1] / 2);
				doc.text(studentName, lastColumnCenter, footerY, { align: 'center' });
				doc.setFontSize(9);
				doc.text(studentInfo.yearSection || '', lastColumnCenter, footerY + 5, { align: 'center' });

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
			{ key: 'no', label: 'No.', width: 'w-12' },
			{ key: 'date', label: 'Date Logged', width: 'w-40' },
			{ key: 'violation', label: 'Violation', width: 'w-[30rem]' },
			{ key: 'reportedBy', label: 'Reported by', width: 'w-40' },
			{ key: 'remarks', label: 'Remarks' },
			{
				key: 'signature',
				label: 'Signature',
				width: 'w-32',
				render: (_value) => (
					<div className="text-xs text-gray-400">
						{_value ? (
							<img
								src={_value}
								alt="Signature"
								className="h-8 w-24 object-contain bg-white rounded border border-gray-200"
							/>
						) : (
							'-'
						)}
					</div>
				),
			},
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
							className="p-2 rounded-lg bg-white hover:bg-gray-200 text-black transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								triggerDownloadAllModal();
							}}
							aria-label="Export all violations"
							title="Export all violations"
						>
							<Download className="w-4 h-4" />
						</button>
					</div>
				),
				render: (_value, row) => (
					<button
						type="button"
						className="p-2 rounded-lg bg-white hover:bg-gray-200 text-black transition-colors"
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

		const filtered = (records || [])
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
			});

		return filtered.map((row, index) => {
			const createdAt = new Date(row.created_at);
			const displayDate = Number.isNaN(createdAt.getTime())
				? '-'
				: createdAt.toLocaleDateString();

			return {
				id: row.id,
				no: index + 1,
				date: displayDate,
				violation: row.violation_label || row.violation_name || '-',
				reportedBy: row.reported_by || '-',
				remarks: row.remarks || '-',
				signature: row.signature_image || row.signatureImage || '',
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
										className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
										onClick={confirmDownload}
									>
										Download
									</button>
								</ModalFooter>
							</Modal>

							<Modal
								isOpen={downloadAllModalOpen}
								onClose={() => setDownloadAllModalOpen(false)}
								title="Export All Violations"
								size="sm"
							>
								<div className="space-y-3">
									<div>
										<p className="text-sm text-gray-200">Export all violation records in the selected format.</p>
									</div>
									<div className="border border-gray-400 rounded px-3 py-2">
										<label className="text-xs text-gray-300">Rows to export: {records.length}</label>
									</div>
									<div className="text-sm font-semibold text-white">Format</div>
									<select
										value={downloadAllFormat}
										onChange={(e) => setDownloadAllFormat(e.target.value)}
										className="w-full rounded-lg border border-gray-500/30 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
									>
										<option value="excel">Excel (.xlsx)</option>
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
										className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
										onClick={confirmDownloadAll}
									>
										Export
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




