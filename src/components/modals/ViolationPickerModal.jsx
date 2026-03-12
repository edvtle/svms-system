import React, { useMemo, useState } from "react";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import SearchBar from "@/components/ui/SearchBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight } from "lucide-react";

function ViolationPickerModal({ isOpen, onClose, violations = [], onSelect }) {
  const [categoryFilter, setCategoryFilter] = useState("minor");
  const [specificDegree, setSpecificDegree] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState(new Set());

  const degreeOrder = [
    "First Degree",
    "Second Degree",
    "Third Degree",
    "Fourth Degree",
    "Fifth Degree",
    "Sixth Degree",
    "Seventh Degree",
  ];

  const availableDegrees = useMemo(() => {
    if (categoryFilter === "minor") {
      return ["First Degree", "Second Degree"];
    }
    if (categoryFilter === "major") {
      return [
        "Third Degree",
        "Fourth Degree",
        "Fifth Degree",
        "Sixth Degree",
        "Seventh Degree",
      ];
    }
    return degreeOrder;
  }, [categoryFilter]);

  const groupedViolations = useMemo(() => {
    const sorted = [...violations].sort((a, b) => {
      const da = degreeOrder.indexOf(a.degree);
      const db = degreeOrder.indexOf(b.degree);
      if (da !== db) return da - db;
      if (a.category !== b.category) return String(a.category).localeCompare(String(b.category));
      return String(a.name).localeCompare(String(b.name));
    });

    const parentChildrenMap = sorted.reduce((acc, item) => {
      if (item.parent_id) {
        if (!acc[item.parent_id]) acc[item.parent_id] = [];
        acc[item.parent_id].push(item);
      }
      return acc;
    }, {});

    return sorted
      .filter((item) => !item.parent_id)
      .map((item) => ({
        ...item,
        children: (parentChildrenMap[item.id] || []).sort((a, b) =>
          String(a.name).localeCompare(String(b.name)),
        ),
      }));
  }, [violations]);

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return groupedViolations.filter((item) => {
      let categoryMatch = true;
      if (categoryFilter === "minor") {
        categoryMatch = ["First Degree", "Second Degree"].includes(item.degree);
      } else if (categoryFilter === "major") {
        categoryMatch = [
          "Third Degree",
          "Fourth Degree",
          "Fifth Degree",
          "Sixth Degree",
          "Seventh Degree",
        ].includes(item.degree);
      }

      const degreeMatch = !specificDegree || item.degree === specificDegree;
      const searchMatch =
        !q ||
        String(item.name || "").toLowerCase().includes(q) ||
        String(item.degree || "").toLowerCase().includes(q) ||
        String(item.category || "").toLowerCase().includes(q) ||
        (item.children || []).some((child) =>
          String(child.name || "").toLowerCase().includes(q),
        );

      return categoryMatch && degreeMatch && searchMatch;
    });
  }, [groupedViolations, categoryFilter, specificDegree, searchQuery]);

  const toggleExpanded = (id) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRows(next);
  };

  const handleSelect = (item) => {
    onSelect?.(item);
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="font-black font-inter">Select Violation</span>}
      size="2xl"
      showCloseButton
    >
      <div>
        <div className="flex gap-4 mb-4 items-center">
          <SearchBar
            placeholder="Search Violation"
            className="flex-1 max-w-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="min-w-[100px] justify-between">
                {specificDegree || "Degree"}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSpecificDegree("")}>All</DropdownMenuItem>
              {availableDegrees.map((degree) => (
                <DropdownMenuItem key={degree} onClick={() => setSpecificDegree(degree)}>
                  {degree}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex mb-4">
          <button
            onClick={() => {
              setCategoryFilter("minor");
              setSpecificDegree("");
            }}
            className={`px-8 py-2.5 rounded-l-lg text-sm font-medium transition-colors ${
              categoryFilter === "minor"
                ? "bg-[#1E1F22] text-white"
                : "bg-[#2D2F33] text-gray-400 hover:text-white"
            }`}
          >
            Minor
          </button>
          <button
            onClick={() => {
              setCategoryFilter("major");
              setSpecificDegree("");
            }}
            className={`px-8 py-2.5 rounded-r-lg text-sm font-medium transition-colors ${
              categoryFilter === "major"
                ? "bg-[#1E1F22] text-white"
                : "bg-[#2D2F33] text-gray-400 hover:text-white"
            }`}
          >
            Major
          </button>
        </div>

        <div className="bg-[#EAECF0] rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-white sticky top-0">
              <tr className="text-gray-900/50 text-[13px]">
                <th className="py-3 px-4 text-left font-medium">Violation</th>
                <th className="py-3 px-4 text-left font-medium">Degree</th>
                <th className="py-3 px-4 text-left font-medium">Category</th>
                <th className="py-3 px-4 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="text-[#1a1a1a]">
              {filteredData.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {row.children?.length > 0 ? (
                          <button
                            onClick={() => toggleExpanded(row.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {expandedRows.has(row.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : null}
                        <span className="font-semibold text-[14px]">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[13px]">{row.degree}</td>
                    <td className="py-3 px-4 text-[13px]">{row.category}</td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 px-3"
                        onClick={() => handleSelect(row)}
                      >
                        Select
                      </Button>
                    </td>
                  </tr>

                  {expandedRows.has(row.id)
                    ? (row.children || []).map((child) => (
                        <tr key={child.id} className="bg-gray-50 border-b border-gray-100">
                          <td className="py-2 px-4 pl-12 text-[13px] text-[#666]">• {child.name}</td>
                          <td className="py-2 px-4 text-[13px] text-[#666]">{child.degree}</td>
                          <td className="py-2 px-4 text-[13px] text-[#666]">{child.category}</td>
                          <td className="py-2 px-4 text-center">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleSelect(child)}
                            >
                              Select
                            </Button>
                          </td>
                        </tr>
                      ))
                    : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {filteredData.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No violations found.</div>
          ) : null}
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
            className="px-8 py-2 bg-white text-[#1a1a1a] border-0 hover:bg-gray-100"
          >
            Close
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

export default ViolationPickerModal;
