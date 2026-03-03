import React, { useState } from 'react'
import DataTable from '@/components/ui/DataTable'
import Button from '@/components/ui/Button'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import SearchBar from '@/components/ui/SearchBar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Plus } from 'lucide-react'

const Violations = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('minor') // 'all', 'minor', 'major'
  const [specificDegree, setSpecificDegree] = useState('') // specific degree filter
  const [formData, setFormData] = useState({
    type: '',
    degree: '',
    violation: '',
  })

  // Comprehensive violation data based on school regulations
  const violationsData = [
    // First Degree Minor Offenses
    { id: 1, violation: 'Loitering', degree: 'First' },
    { id: 2, violation: 'Littering', degree: 'First' },
    { id: 3, violation: 'Classroom Disturbance', degree: 'First' },
    { id: 4, violation: 'Eating/Drinking in Academic Facilities', degree: 'First' },
    { id: 5, violation: 'Improper disposal of waste/littering', degree: 'First' },
    { id: 6, violation: 'Not wearing a school ID', degree: 'First' },
    { id: 7, violation: 'Unauthorized use of school property', degree: 'First' },
    { id: 8, violation: 'Shorts, skirts, or dresses above mid-thigh', degree: 'First' },
    { id: 9, violation: 'Low-rise, tattered, or ripped jeans', degree: 'First' },
    { id: 10, violation: 'Lounge wear, Pajamas, Leggings worn as outwear', degree: 'First' },
    { id: 11, violation: 'Sleeveless tops, tube tops, or low-cut shirts', degree: 'First' },
    { id: 12, violation: 'Midriff-exposing tops or see-through garments', degree: 'First' },
    { id: 13, violation: 'Shirts with offensive messages', degree: 'First' },
    { id: 14, violation: 'Unnaturally bright or extreme hair colors', degree: 'First' },
    { id: 15, violation: 'Wearing multiple or oversized accessories', degree: 'First' },
    { id: 16, violation: 'Slippers, flip-flops', degree: 'First' },
    { id: 17, violation: 'Slip on clogs with open backs', degree: 'First' },
    { id: 18, violation: 'Open-toe and strappy sandals', degree: 'First' },
    { id: 19, violation: 'Step-ins or shoes without heel supports', degree: 'First' },
    { id: 20, violation: 'Sitting on the stairs', degree: 'First' },

    // Second Degree Minor Offenses
    { id: 21, violation: 'Courting/Coupling', degree: 'Second' },
    { id: 22, violation: 'PDA (Public Display of Affection)', degree: 'Second' },
    { id: 23, violation: 'Holding or Touching', degree: 'Second' },
    { id: 24, violation: 'Rough games / Quarreling / Boisterous behavior', degree: 'Second' },
    { id: 25, violation: 'Use of Vulgar Expressions', degree: 'Second' },
    { id: 26, violation: 'Unauthorized use of gadgets within class hours', degree: 'Second' },
    { id: 27, violation: 'Cutting classes', degree: 'Second' },

    // Third Degree Major Offenses
    { id: 28, violation: 'Lending or using somebody else\'s ID', degree: 'Third' },
    { id: 29, violation: 'Insubordination', degree: 'Third' },
    { id: 30, violation: 'Vandalism', degree: 'Third' },
    { id: 31, violation: 'Pornographic Materials / Obscenity', degree: 'Third' },
    { id: 32, violation: 'Disrespect to Authority', degree: 'Third' },
    { id: 33, violation: 'Unauthorized Use of School Name/Representation', degree: 'Third' },
    { id: 34, violation: 'Cat calling / name calling', degree: 'Third' },

    // Fourth Degree Major Offenses
    { id: 35, violation: 'Cheating', degree: 'Fourth' },
    { id: 36, violation: 'Stealing', degree: 'Fourth' },

    // Fifth Degree Major Offenses
    { id: 37, violation: 'Possession or Passing of Fireworks', degree: 'Fifth' },
    { id: 38, violation: 'Bribery', degree: 'Fifth' },
    { id: 39, violation: 'Theft', degree: 'Fifth' },
    { id: 40, violation: 'Extortion', degree: 'Fifth' },
    { id: 41, violation: 'Acts of Violence', degree: 'Fifth' },
    { id: 42, violation: 'Falsification', degree: 'Fifth' },
    { id: 43, violation: 'Deceitful acts', degree: 'Fifth' },
    { id: 44, violation: 'Slander', degree: 'Fifth' },
    { id: 45, violation: 'Gambling', degree: 'Fifth' },
    { id: 46, violation: 'Fist fighting / Physical Injury', degree: 'Fifth' },
    { id: 47, violation: 'Choking', degree: 'Fifth' },
    { id: 48, violation: 'Threatening and Intimidating others', degree: 'Fifth' },
    { id: 49, violation: 'Bullying (Written or Action)', degree: 'Fifth' },
    { id: 50, violation: 'Possession or Passing of Deadly weapons', degree: 'Fifth' },
    { id: 51, violation: 'Alcohol (Bringing or drinking)', degree: 'Fifth' },
    { id: 52, violation: 'Coming to school intoxicated', degree: 'Fifth' },
    { id: 53, violation: 'Smoking or Vaping', degree: 'Fifth' },

    // Sixth Degree Major Offenses
    { id: 54, violation: 'Any act of dishonesty', degree: 'Sixth' },
    { id: 55, violation: 'Defamation', degree: 'Sixth' },
    { id: 56, violation: 'Immoralities', degree: 'Sixth' },
    { id: 57, violation: 'Sexual Harassment', degree: 'Sixth' },
    { id: 58, violation: 'Malicious acts', degree: 'Sixth' },

    // Seventh Degree Major Offenses (Most Serious)
    { id: 59, violation: 'Unrecognized Organizations', degree: 'Seventh' },
    { id: 60, violation: 'Drug Possession/Distribution', degree: 'Seventh' },
    { id: 61, violation: 'Acts of Harm', degree: 'Seventh' },
    { id: 62, violation: 'Explosives', degree: 'Seventh' },
    { id: 63, violation: 'Unauthorized Strikes', degree: 'Seventh' },
    { id: 64, violation: 'Dishonor to PLP', degree: 'Seventh' },
    { id: 65, violation: 'Public Misconduct', degree: 'Seventh' },
    { id: 66, violation: 'Defamatory/Obscene Content', degree: 'Seventh' },
    { id: 67, violation: 'Unauthorized Representation', degree: 'Seventh' },
    { id: 68, violation: 'Unauthorized Media Statements', degree: 'Seventh' },
    { id: 69, violation: 'Event Disruption', degree: 'Seventh' },
  ]

  // Get available degrees based on category filter
  const getAvailableDegrees = () => {
    if (categoryFilter === 'minor') {
      return ['First', 'Second']
    } else if (categoryFilter === 'major') {
      return ['Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh']
    }
    return ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh']
  }

  const availableDegrees = getAvailableDegrees()

  // Filter data based on category and specific degree selection
  const filteredData = violationsData.filter(item => {
    // First, filter by category (minor/major/all)
    let categoryMatch = true
    if (categoryFilter === 'minor') {
      categoryMatch = ['First', 'Second'].includes(item.degree)
    } else if (categoryFilter === 'major') {
      categoryMatch = ['Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'].includes(item.degree)
    }

    // Then, filter by specific degree if selected
    let degreeMatch = !specificDegree || item.degree === specificDegree

    return categoryMatch && degreeMatch
  })

  const columns = [
    { key: 'violation', label: 'Violation', width: 'w-2/3' },
    { key: 'degree', label: 'Degree', width: 'w-1/3' },
  ]

  const handleAddViolation = () => {
    console.log('New violation:', formData)
    setFormData({ type: '', degree: '', violation: '' })
    setIsModalOpen(false)
  }

  const handleViolationRowClick = (violation) => {
    console.log('Violation clicked:', violation)
    // Add your logic here - e.g., open edit modal, navigate, etc.
  }

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-wide">VIOLATIONS</h2>
        <Button
          variant="secondary"
          size="sm"
          className="gap-2 flex items-center"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add Violation
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6 items-center">
        <SearchBar placeholder="Search Violation" className="flex-1 max-w-xs" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="min-w-[100px] justify-between">
              Degree
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSpecificDegree('')}>
              All
            </DropdownMenuItem>
            {availableDegrees.map(degree => (
              <DropdownMenuItem key={degree} onClick={() => setSpecificDegree(degree)}>
                {degree}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Minor/Major Toggle */}
      <div className="flex mb-4">
        <button
          onClick={() => { setCategoryFilter('minor'); setSpecificDegree('') }}
          className={`px-8 py-2.5 rounded-l-lg text-sm font-medium transition-colors ${
            categoryFilter === 'minor'
              ? 'bg-[#1E1F22] text-white'
              : 'bg-[#2D2F33] text-gray-400 hover:text-white'
          }`}
        >
          Minor
        </button>
        <button
          onClick={() => { setCategoryFilter('major'); setSpecificDegree('') }}
          className={`px-8 py-2.5 rounded-r-lg text-sm font-medium transition-colors ${
            categoryFilter === 'major'
              ? 'bg-[#1E1F22] text-white'
              : 'bg-[#2D2F33] text-gray-400 hover:text-white'
          }`}
        >
          Major
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-[#23262B] rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">List of Violation</h3>
        <DataTable columns={columns} data={filteredData} onRowClick={handleViolationRowClick} />
      </div>

      {/* Add Violation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Violation"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full bg-[#3a3a3a] text-white rounded-lg px-4 py-2 border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm"
            >
              <option value="">Select Type</option>
              <option value="academic">Academic</option>
              <option value="behavioral">Behavioral</option>
              <option value="conduct">Conduct</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Degree</label>
            <select
              value={formData.degree}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
              className="w-full bg-[#3a3a3a] text-white rounded-lg px-4 py-2 border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm"
            >
              <option value="">Select Degree</option>
              <option value="First">First</option>
              <option value="Second">Second</option>
              <option value="Third">Third</option>
              <option value="Fourth">Fourth</option>
              <option value="Fifth">Fifth</option>
              <option value="Sixth">Sixth</option>
              <option value="Seventh">Seventh</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Violation</label>
            <textarea
              value={formData.violation}
              onChange={(e) => setFormData({ ...formData, violation: e.target.value })}
              placeholder="Enter violation details..."
              className="w-full bg-[#3a3a3a] text-white rounded-lg px-4 py-3 border border-white/10 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm resize-none"
              rows="5"
            />
          </div>

          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="bg-gray-500 text-white hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddViolation}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  )
}

export default Violations
