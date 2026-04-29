from fpdf import FPDF
from datetime import datetime

class BugReportExporter:
    def __init__(self, reports):
        self.reports = reports

    def generate_pdf(self, output_path):
        pdf = FPDF()
        pdf.add_page()
        
        # Header
        pdf.set_font("Arial", 'B', 24)
        pdf.set_text_color(99, 102, 241) # Indigo
        pdf.cell(0, 20, "Bug Registry Audit Report", ln=True, align='C')
        
        pdf.set_font("Arial", '', 10)
        pdf.set_text_color(113, 113, 122)
        pdf.cell(0, 10, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align='C')
        pdf.ln(10)
        
        # Stats Summary
        total = len(self.reports)
        critical = len([r for r in self.reports if r['priority'] == 'Critical'])
        pdf.set_font("Arial", 'B', 12)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 10, f"Summary: {total} Issues Identified ({critical} Critical)", ln=True)
        pdf.ln(5)
        
        # Table Header
        pdf.set_fill_color(244, 244, 245)
        pdf.set_font("Arial", 'B', 10)
        pdf.cell(80, 10, "Description", 1, 0, 'C', True)
        pdf.cell(30, 10, "Category", 1, 0, 'C', True)
        pdf.cell(30, 10, "Priority", 1, 0, 'C', True)
        pdf.cell(50, 10, "Source File", 1, 1, 'C', True)
        
        # Table Body
        pdf.set_font("Arial", '', 8)
        for r in self.reports:
            # Multi-line cell for description
            desc = r['description'][:100] + "..." if len(r['description']) > 100 else r['description']
            x = pdf.get_x()
            y = pdf.get_y()
            pdf.multi_cell(80, 10, desc, 1)
            pdf.set_xy(x + 80, y)
            pdf.cell(30, 10, r['category'], 1)
            pdf.cell(30, 10, r['priority'], 1)
            pdf.cell(50, 10, r['source_file'], 1, 1)
            
        pdf.output(output_path)
        return output_path
