import React, { useEffect, useRef, useState } from "react";
import Modal, { ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 220;

function SignaturePadModal({ isOpen, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [isOpen]);

  const getPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if (event.touches?.[0]) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getPosition(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (event) => {
    if (!isDrawing) return;
    event.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getPosition(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (event) => {
    if (event) event.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const image = canvas.toDataURL("image/png");
    onSave?.(image);
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="font-black font-inter">Attach Signature</span>}
      size="2xl"
      showCloseButton
    >
      <div>
        <p className="text-sm text-gray-300 mb-4">
          Draw the student signature using your mouse or touchpad.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-[220px] rounded-lg cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <ModalFooter className="pt-4">
          <Button
            variant="secondary"
            type="button"
            className="px-6"
            onClick={clearCanvas}
          >
            Clear Pad
          </Button>
          <Button
            variant="outline"
            type="button"
            className="px-6 bg-white text-[#1a1a1a] border-0 hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            className="px-6 bg-[#556987] text-white hover:bg-[#3d4654]"
            onClick={handleSave}
            disabled={!hasSignature}
          >
            Save Signature
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

export default SignaturePadModal;
