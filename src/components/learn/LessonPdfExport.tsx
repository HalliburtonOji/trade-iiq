import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lesson } from "@/data/lessonsData";

interface Props {
  lesson: Lesson;
}

const LessonPdfExport = ({ lesson }: Props) => {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxW = pw - margin * 2;
      let y = 25;

      const addPageIfNeeded = (needed: number) => {
        if (y + needed > 270) {
          doc.addPage();
          y = 25;
        }
      };

      // Title
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(`${lesson.icon} ${lesson.title}`, margin, y);
      y += 10;

      // Meta
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(`${lesson.category} · ${lesson.difficulty} · ${lesson.duration_minutes} min · +${lesson.xp_reward} XP`, margin, y);
      y += 8;
      doc.setTextColor(0);

      // Summary
      doc.setFontSize(11);
      const summaryLines = doc.splitTextToSize(lesson.summary, maxW);
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 5 + 6;

      // Divider
      doc.setDrawColor(200);
      doc.line(margin, y, pw - margin, y);
      y += 8;

      // Content sections
      for (const section of lesson.content) {
        addPageIfNeeded(20);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(section.heading, margin, y);
        y += 7;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        for (const para of section.body) {
          const lines = doc.splitTextToSize(para, maxW);
          addPageIfNeeded(lines.length * 5 + 4);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 4;
        }
        y += 4;
      }

      // Why it matters
      addPageIfNeeded(25);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 98, 255);
      doc.text("💡 Why This Matters", margin, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      const whyLines = doc.splitTextToSize(lesson.why_it_matters, maxW);
      doc.text(whyLines, margin, y);
      y += whyLines.length * 5 + 6;

      // Practical example
      addPageIfNeeded(25);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("📖 Practical Example", margin, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const exLines = doc.splitTextToSize(lesson.practical_example, maxW);
      doc.text(exLines, margin, y);
      y += exLines.length * 5 + 6;

      // Common mistake
      addPageIfNeeded(25);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 50, 50);
      doc.text("⚠️ Common Mistake", margin, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      const cmLines = doc.splitTextToSize(lesson.common_mistake, maxW);
      doc.text(cmLines, margin, y);
      y += cmLines.length * 5 + 6;

      // Takeaways
      addPageIfNeeded(30);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Key Takeaways", margin, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      for (const t of lesson.takeaways) {
        const tLines = doc.splitTextToSize(`• ${t}`, maxW - 4);
        addPageIfNeeded(tLines.length * 5 + 2);
        doc.text(tLines, margin + 2, y);
        y += tLines.length * 5 + 2;
      }

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(150);
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`TradeIQ Academy · ${lesson.title} · Page ${i}/${pageCount}`, pw / 2, 287, { align: "center" });
      }

      doc.save(`${lesson.slug}-guide.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport} disabled={generating}>
      {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {generating ? "Generating..." : "Download PDF"}
    </Button>
  );
};

export default LessonPdfExport;
