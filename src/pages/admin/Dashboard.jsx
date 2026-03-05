import React, { useState, useEffect } from "react";
import Card from "../../components/ui/Card";
import AdminStatCard from "../../components/ui/AdminStatCard";
import {
  AddViolationButton,
  ViewStudentsButton,
} from "../../components/ui/QuickActionButton";
import AnimatedContent from "../../components/ui/AnimatedContent";
import DataTable, {
  TableCellText,
  TableCellDateTime,
  TableCellBadge,
} from "../../components/ui/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, AlertTriangle, Users, Trash2 } from "lucide-react";

const Dashboard = () => {
  const [selectedSemester, setSelectedSemester] = useState("1st Sem");
  const [leftWidth, setLeftWidth] = useState(65);
  const [chartsRowHeight, setChartsRowHeight] = useState(420);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // "horizontal", "vertical", or "corner"

  const rankingData = [
    {
      rank: "01",
      name: "Jenny Hernandez",
      violations: 6,
      color: "bg-cyan-500",
    },
    {
      rank: "02",
      name: "Edrianne Lumabas",
      violations: 4,
      color: "bg-cyan-500",
    },
    {
      rank: "03",
      name: "Jessa Marie Balnig",
      violations: 3,
      color: "bg-cyan-500",
    },
    { rank: "04", name: "Raiza Roces", violations: 2, color: "bg-cyan-500" },
    { rank: "05", name: "Marie Curie", violations: 2, color: "bg-cyan-500" },
    {
      rank: "06",
      name: "Lyrika Jewel Hermoso",
      violations: 2,
      color: "bg-cyan-500",
    },
    { rank: "07", name: "Sienna", violations: 2, color: "bg-cyan-500" },
    { rank: "08", name: "Gucci", violations: 2, color: "bg-cyan-500" },
  ];

  const recentActivity = [
    {
      date: "02/02/26",
      time: "12:00AM",
      name: "Edrianne Lumabas",
      id: "23-0001",
      program: "BSIT - 1A",
      type: "Academic",
    },
    {
      date: "02/02/26",
      time: "11:00AM",
      name: "Jenny Hernandez",
      id: "23-0002",
      program: "BSIT - 2A",
      type: "Behavioral",
    },
    {
      date: "02/02/26",
      time: "10:00AM",
      name: "Lyrika Hermozo",
      id: "23-0003",
      program: "BSCS - 3A",
      type: "Academic",
    },
    {
      date: "02/02/26",
      time: "9:00AM",
      name: "Jessa Marie Balnig",
      id: "23-0004",
      program: "BSCS - 4A",
      type: "Behavioral",
    },
    {
      date: "02/02/26",
      time: "8:00AM",
      name: "Raiza Roces",
      id: "23-0005",
      program: "BSIT - 1A",
      type: "Academic",
    },
  ];

  // Handle horizontal resizing via vertical line in the middle
  const handleHorizontalResizeStart = (e) => {
    setIsDragging(true);
    setDragType("horizontal");
    const container = e.currentTarget.closest("div[data-chart-container]");
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const handleMove = (moveEvent) => {
      const newWidth = ((moveEvent.clientX - rect.left) / rect.width) * 100;

      // Constrain between 30% and 75%
      if (newWidth >= 30 && newWidth <= 75) {
        setLeftWidth(newWidth);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setDragType(null);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  };

  // Handle corner resizing (both horizontal and vertical)
  const handleCornerResizeStart = (e) => {
    setIsDragging(true);
    setDragType("corner");
    const container = e.currentTarget.closest("div[data-chart-container]");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startHeight = chartsRowHeight;
    const startY = e.clientY;

    const handleMove = (moveEvent) => {
      // Handle vertical resizing
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(300, startHeight + deltaY); // Min height of 300px
      setChartsRowHeight(newHeight);

      // Handle horizontal resizing
      const newWidth = ((moveEvent.clientX - rect.left) / rect.width) * 100;

      // Constrain width between 30% and 75%
      if (newWidth >= 30 && newWidth <= 75) {
        setLeftWidth(newWidth);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setDragType(null);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  };

  return (
    <div className="text-white">
      {/* Header */}
      <AnimatedContent
        distance={50}
        direction="vertical"
        duration={0.6}
        delay={0}
      >
        <div className="mb-6">
          <h1 className="text-page-title">Dashboard</h1>
          <p className="text-page-subtitle mt-1">
            Monitor violations and student activity at a glance
          </p>
        </div>
      </AnimatedContent>

      {/* Stats and Actions Row */}
      <AnimatedContent
        distance={50}
        direction="vertical"
        duration={0.6}
        delay={0.1}
      >
        <div className="flex gap-4 mb-6">
          {/* Stats Cards */}
          <div className="flex gap-4 flex-1">
            <AdminStatCard
              title="Active Violations"
              value="0"
              percentage={0}
              comparisonLabel="vs last semester"
              icon={<AlertTriangle className="w-5 h-5 text-orange-400" />}
              iconBgColor="bg-orange-500/20"
              className="flex-1"
            />
            <AdminStatCard
              title="At-Risk Students"
              value="0"
              percentage={0}
              comparisonLabel="vs last semester"
              icon={<Users className="w-5 h-5 text-cyan-400" />}
              iconBgColor="bg-cyan-500/20"
              className="flex-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <AddViolationButton
              onClick={() => console.log("Add Violation")}
              className="flex-1"
            />
            <ViewStudentsButton
              onClick={() => console.log("View Students")}
              className="flex-1"
            />
          </div>
        </div>
      </AnimatedContent>

      {/* Charts Row */}
      <AnimatedContent
        distance={50}
        direction="vertical"
        duration={0.6}
        delay={0.2}
      >
        <div
          data-chart-container
          className="relative"
          style={{
            display: "grid",
            gridTemplateColumns: `${leftWidth}% ${100 - leftWidth}%`,
            gap: "1rem",
            height: `${chartsRowHeight}px`,
            transition: dragType ? "none" : "height 0.2s ease-out",
            marginBottom: "1.5rem",
          }}
        >
          {/* Violation Trends Chart */}
          <Card
            variant="glass"
            padding="md"
            className="relative h-full flex flex-col overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-section-title">
                Violation trends over the semester
              </h3>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-lg border border-white/10">
                      {selectedSemester}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setSelectedSemester("1st Sem")}
                    >
                      1st Sem
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedSemester("2nd Sem")}
                    >
                      2nd Sem
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <button className="text-gray-400">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Chart Placeholder */}
            <div className="flex-1 flex items-end justify-between px-4 relative">
              <svg
                className="w-full h-full absolute inset-0"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="lineGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 140 Q 80 120, 120 130 T 200 80 T 280 90 T 360 60 T 440 70"
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                />
                <circle
                  cx="120"
                  cy="130"
                  r="6"
                  fill="#fff"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
                <circle
                  cx="200"
                  cy="80"
                  r="6"
                  fill="#fff"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
                <circle
                  cx="360"
                  cy="60"
                  r="6"
                  fill="#fff"
                  stroke="#06b6d4"
                  strokeWidth="2"
                />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-muted px-2">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>
            {/* Horizontal Resize Handle */}
            <div
              onMouseDown={handleHorizontalResizeStart}
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-cyan-500/60 transition-colors opacity-0 hover:opacity-100"
              style={{ userSelect: "none" }}
            />

            {/* Corner Resize Handle */}
            <div
              onMouseDown={handleCornerResizeStart}
              className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize"
              style={{
                userSelect: "none",
                background:
                  "linear-gradient(135deg, transparent 50%, rgba(6, 182, 212, 0.4) 50%)",
                transition: dragType === "corner" ? "none" : "all 0.2s ease",
                opacity: isDragging ? 1 : 0.3,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "linear-gradient(135deg, transparent 50%, rgba(6, 182, 212, 0.8) 50%)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "linear-gradient(135deg, transparent 50%, rgba(6, 182, 212, 0.4) 50%)")
              }
            />
          </Card>

          {/* Student Violation Ranking */}
          <Card
            variant="glass"
            padding="md"
            className="w-full h-full flex flex-col overflow-hidden"
          >
            <h3 className="text-section-title mb-4 flex-shrink-0">
              Student Violation Ranking
            </h3>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-[32px_1fr_160px] text-table-header mt-7 mb-2">
                <span>#</span>
                <span>Name</span>
                <span className="text-right">Total of Violations</span>
              </div>
              {rankingData.map((student) => {
                const textSize =
                  student.rank === "01"
                    ? "text-lg font-semibold"
                    : student.rank === "02"
                      ? "text-base font-medium"
                      : student.rank === "03"
                        ? "text-[15px] font-medium"
                        : "text-[15px]";
                const rankNumSize =
                  student.rank === "01"
                    ? "text-lg font-bold text-white"
                    : student.rank === "02"
                      ? "text-base font-semibold text-gray-300"
                      : student.rank === "03"
                        ? "text-[15px] font-medium text-gray-400"
                        : "text-[15px] text-gray-400";
                const barHeight =
                  student.rank === "01"
                    ? "h-3"
                    : student.rank === "02"
                      ? "h-2.5"
                      : "h-2";

                return (
                  <div
                    key={student.rank}
                    className="grid grid-cols-[32px_1fr_160px] items-center"
                  >
                    <span className={rankNumSize}>{student.rank}</span>
                    <span className={textSize}>{student.name}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex-1 bg-white/10 rounded-full ${barHeight}`}
                      >
                        <div
                          className={`${student.color} ${barHeight} rounded-full`}
                          style={{
                            width: `${(student.violations / 6) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[13px] bg-white/10 px-2 py-1 rounded min-w-[28px] text-center">
                        {student.violations}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </AnimatedContent>

      {/* Recent Activity Table */}
      <AnimatedContent
        distance={50}
        direction="vertical"
        duration={0.6}
        delay={0.3}
      >
        <Card variant="glass" padding="md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-section-title">Recent Activity</h3>
            <button className="text-gray-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>
          <DataTable
            columns={[
              {
                key: "date",
                label: "Date",
                render: (_, row) => (
                  <TableCellDateTime date={row.date} time={row.time} />
                ),
              },
              {
                key: "name",
                label: "Student Name",
                render: (_, row) => (
                  <TableCellText primary={row.name} secondary={row.id} />
                ),
              },
              { key: "program", label: "Program/Year/Section" },
              {
                key: "type",
                label: "Type",
                render: (value) => (
                  <TableCellBadge
                    label={value}
                    variant={value === "Academic" ? "primary" : "warning"}
                  />
                ),
              },
            ]}
            data={recentActivity}
            actions={[
              {
                label: "Delete",
                icon: <Trash2 className="w-4 h-4" />,
                variant: "danger",
                onClick: (row) => console.log("Delete", row),
              },
            ]}
            onRowClick={(row) => console.log("Row clicked", row)}
          />
        </Card>
      </AnimatedContent>
    </div>
  );
};

export default Dashboard;
