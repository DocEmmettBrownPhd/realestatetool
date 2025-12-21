"""
Real Estate Analysis Report Generator
Generates PDF and Excel reports from analysis data
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime
import os


def format_currency(value):
    """Format number as currency"""
    return f"${value:,.0f}"


def format_percent(value):
    """Format number as percentage"""
    return f"{value:.1f}%"


def generate_pdf_report(analysis_data, output_path):
    """
    Generate professional PDF report from analysis data
    
    Args:
        analysis_data: Dictionary with comps, scenarios, property data
        output_path: Where to save the PDF
    """
    
    # Create PDF document
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=12,
        spaceBefore=20
    )
    
    # Title
    title = Paragraph("Real Estate Investment Analysis", title_style)
    story.append(title)
    
    # Property Info
    property_info = f"""
    <b>Address:</b> {analysis_data.get('address', 'N/A')}<br/>
    <b>Date:</b> {datetime.now().strftime('%B %d, %Y')}<br/>
    <b>Purchase Price:</b> {format_currency(analysis_data.get('propertyData', {}).get('purchasePrice', 0))}<br/>
    <b>Square Feet:</b> {analysis_data.get('propertyData', {}).get('currentSqft', 0):,} sqft<br/>
    <b>Beds/Baths:</b> {analysis_data.get('propertyData', {}).get('beds', 0)}bd / {analysis_data.get('propertyData', {}).get('baths', 0)}ba<br/>
    <b>Lot Size:</b> {analysis_data.get('propertyData', {}).get('lotSize', 0)} acres
    """
    story.append(Paragraph(property_info, styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Comparable Sales Section
    if 'comps' in analysis_data:
        comps = analysis_data['comps']
        
        story.append(Paragraph("Comparable Sales Analysis", heading_style))
        
        # Summary stats
        summary_data = [
            ['Metric', 'Value'],
            ['Comps Found', str(comps.get('total_comps_found', 0))],
            ['Average Sale Price', format_currency(comps.get('average_price', 0))],
            ['Average Price/SqFt', f"${comps.get('average_price_per_sqft', 0):.2f}"],
            ['Estimated ARV', format_currency(comps.get('estimated_value', 0))]
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0'))
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Individual comps
        if comps.get('comps'):
            story.append(Paragraph("Individual Comparable Sales", heading_style))
            
            comp_data = [['Address', 'Sale Price', 'Beds/Baths', 'SqFt', 'Price/SqFt', 'Distance']]
            
            for comp in comps['comps'][:5]:  # Top 5 comps
                comp_data.append([
                    comp['address']['streetAddress'],
                    format_currency(comp['price']['value']),
                    f"{comp['bedrooms']}/{comp['bathrooms']}",
                    f"{comp['livingArea']:,}",
                    f"${comp['price_per_sqft']:.2f}",
                    f"{comp['distance_miles']} mi"
                ])
            
            comp_table = Table(comp_data, colWidths=[2*inch, 1*inch, 0.8*inch, 0.8*inch, 0.9*inch, 0.7*inch])
            comp_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0'))
            ]))
            story.append(comp_table)
    
    story.append(PageBreak())
    
    # Investment Scenarios Section
    if 'scenarios' in analysis_data:
        story.append(Paragraph("Investment Scenario Analysis", heading_style))
        story.append(Spacer(1, 10))
        
        # Ranking table
        scenario_data = [['Rank', 'Strategy', 'ROI', 'Profit/Cash Flow', 'Timeline']]
        
        for idx, scenario in enumerate(analysis_data['scenarios'][:6], 1):  # Top 6
            profit_value = scenario.get('netProfit') or scenario.get('netCashFlow', 0)
            profit_label = format_currency(profit_value) if scenario.get('netProfit') else f"{format_currency(profit_value)}/mo"
            
            scenario_data.append([
                f"#{idx}",
                scenario['name'],
                format_percent(scenario['roi']),
                profit_label,
                scenario['timeline']
            ])
        
        scenario_table = Table(scenario_data, colWidths=[0.6*inch, 2.2*inch, 1*inch, 1.5*inch, 1*inch])
        scenario_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (0, 1), colors.HexColor('#10B981')),  # Highlight #1
            ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor('#065F46')),
            ('BACKGROUND', (0, 2), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0'))
        ]))
        story.append(scenario_table)
        story.append(Spacer(1, 30))
        
        # Detailed breakdown of top 3 scenarios
        story.append(Paragraph("Top 3 Scenarios - Detailed Breakdown", heading_style))
        
        for idx, scenario in enumerate(analysis_data['scenarios'][:3], 1):
            story.append(Spacer(1, 15))
            
            # Scenario title
            scenario_title = Paragraph(f"<b>#{idx}: {scenario['name']}</b>", styles['Heading3'])
            story.append(scenario_title)
            story.append(Spacer(1, 5))
            
            # Details table
            details_data = [
                ['Purchase Price', format_currency(scenario['purchasePrice'])],
                ['Rehab/Construction', format_currency(scenario.get('rehabCost', 0))],
                ['Total Investment', format_currency(scenario['totalCosts'])],
            ]
            
            if scenario.get('netProfit'):
                details_data.append(['Net Profit', format_currency(scenario['netProfit'])])
            if scenario.get('netCashFlow'):
                details_data.append(['Monthly Cash Flow', format_currency(scenario['netCashFlow'])])
            if scenario.get('arv'):
                details_data.append(['After Repair Value', format_currency(scenario['arv'])])
            
            details_data.append(['ROI', format_percent(scenario['roi'])])
            details_data.append(['Timeline', scenario['timeline']])
            
            details_table = Table(details_data, colWidths=[2.5*inch, 2.5*inch])
            details_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ]))
            story.append(details_table)
    
    # Footer
    story.append(Spacer(1, 50))
    footer = Paragraph(
        f"<i>Generated by Real Estate Analysis Tool on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</i>",
        styles['Normal']
    )
    story.append(footer)
    
    # Build PDF
    doc.build(story)
    print(f"✅ PDF report saved: {output_path}")
    return output_path


def generate_excel_report(analysis_data, output_path):
    """
    Generate detailed Excel report from analysis data
    
    Args:
        analysis_data: Dictionary with comps, scenarios, property data
        output_path: Where to save the Excel file
    """
    
    # Create workbook
    wb = openpyxl.Workbook()
    
    # Remove default sheet
    wb.remove(wb.active)
    
    # Styles
    header_fill = PatternFill(start_color="3B82F6", end_color="3B82F6", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)
    cell_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Summary Sheet
    ws_summary = wb.create_sheet("Summary")
    ws_summary['A1'] = "REAL ESTATE INVESTMENT ANALYSIS"
    ws_summary['A1'].font = Font(bold=True, size=16)
    ws_summary.merge_cells('A1:D1')
    
    # Property Info
    ws_summary['A3'] = "Property Information"
    ws_summary['A3'].font = Font(bold=True, size=12)
    
    property_data = analysis_data.get('propertyData', {})
    ws_summary['A4'] = "Address:"
    ws_summary['B4'] = analysis_data.get('address', '')
    ws_summary['A5'] = "Purchase Price:"
    ws_summary['B5'] = property_data.get('purchasePrice', 0)
    ws_summary['B5'].number_format = '$#,##0'
    ws_summary['A6'] = "Square Feet:"
    ws_summary['B6'] = property_data.get('currentSqft', 0)
    ws_summary['A7'] = "Beds/Baths:"
    ws_summary['B7'] = f"{property_data.get('beds', 0)}/{property_data.get('baths', 0)}"
    ws_summary['A8'] = "Lot Size:"
    ws_summary['B8'] = f"{property_data.get('lotSize', 0)} acres"
    
    # Comps Summary
    if 'comps' in analysis_data:
        comps = analysis_data['comps']
        ws_summary['A10'] = "Comparable Sales Summary"
        ws_summary['A10'].font = Font(bold=True, size=12)
        
        ws_summary['A11'] = "Comps Found:"
        ws_summary['B11'] = comps.get('total_comps_found', 0)
        ws_summary['A12'] = "Average Price:"
        ws_summary['B12'] = comps.get('average_price', 0)
        ws_summary['B12'].number_format = '$#,##0'
        ws_summary['A13'] = "Avg Price/SqFt:"
        ws_summary['B13'] = comps.get('average_price_per_sqft', 0)
        ws_summary['B13'].number_format = '$#,##0.00'
        ws_summary['A14'] = "Estimated ARV:"
        ws_summary['B14'] = comps.get('estimated_value', 0)
        ws_summary['B14'].number_format = '$#,##0'
        ws_summary['B14'].font = Font(bold=True, color="10B981")
    
    # Best Scenario
    if 'scenarios' in analysis_data and analysis_data['scenarios']:
        best = analysis_data['scenarios'][0]
        ws_summary['A16'] = "RECOMMENDED STRATEGY"
        ws_summary['A16'].font = Font(bold=True, size=12, color="10B981")
        
        ws_summary['A17'] = "Strategy:"
        ws_summary['B17'] = best['name']
        ws_summary['B17'].font = Font(bold=True)
        ws_summary['A18'] = "ROI:"
        ws_summary['B18'] = best['roi'] / 100
        ws_summary['B18'].number_format = '0.0%'
        ws_summary['B18'].font = Font(bold=True, color="10B981")
        ws_summary['A19'] = "Timeline:"
        ws_summary['B19'] = best['timeline']
    
    # Auto-width columns
    ws_summary.column_dimensions['A'].width = 20
    ws_summary.column_dimensions['B'].width = 25
    
    # Comps Sheet
    if 'comps' in analysis_data and analysis_data['comps'].get('comps'):
        ws_comps = wb.create_sheet("Comparable Sales")
        
        # Headers
        headers = ['Address', 'City', 'Sale Price', 'Beds', 'Baths', 'SqFt', 'Price/SqFt', 'Sale Date', 'Distance']
        for col, header in enumerate(headers, 1):
            cell = ws_comps.cell(row=1, column=col, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.border = cell_border
            cell.alignment = Alignment(horizontal='center')
        
        # Data
        for row, comp in enumerate(analysis_data['comps']['comps'], 2):
            ws_comps.cell(row=row, column=1, value=comp['address']['streetAddress'])
            ws_comps.cell(row=row, column=2, value=comp['address']['city'])
            ws_comps.cell(row=row, column=3, value=comp['price']['value']).number_format = '$#,##0'
            ws_comps.cell(row=row, column=4, value=comp['bedrooms'])
            ws_comps.cell(row=row, column=5, value=comp['bathrooms'])
            ws_comps.cell(row=row, column=6, value=comp['livingArea'])
            ws_comps.cell(row=row, column=7, value=comp['price_per_sqft']).number_format = '$#,##0.00'
            ws_comps.cell(row=row, column=8, value=comp['listing']['dateSold'])
            ws_comps.cell(row=row, column=9, value=comp['distance_miles']).number_format = '0.00'
        
        # Auto-width
        for col in range(1, 10):
            ws_comps.column_dimensions[get_column_letter(col)].width = 15
    
    # Scenarios Sheet
    if 'scenarios' in analysis_data:
        ws_scenarios = wb.create_sheet("All Scenarios")
        
        # Headers
        headers = ['Rank', 'Strategy', 'Purchase', 'Rehab/Construction', 'Total Cost', 'Profit/Cash Flow', 'ROI', 'Timeline']
        for col, header in enumerate(headers, 1):
            cell = ws_scenarios.cell(row=1, column=col, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.border = cell_border
            cell.alignment = Alignment(horizontal='center')
        
        # Data
        for row, scenario in enumerate(analysis_data['scenarios'], 2):
            ws_scenarios.cell(row=row, column=1, value=row-1)
            ws_scenarios.cell(row=row, column=2, value=scenario['name'])
            ws_scenarios.cell(row=row, column=3, value=scenario['purchasePrice']).number_format = '$#,##0'
            ws_scenarios.cell(row=row, column=4, value=scenario.get('rehabCost', 0)).number_format = '$#,##0'
            ws_scenarios.cell(row=row, column=5, value=scenario['totalCosts']).number_format = '$#,##0'
            
            profit = scenario.get('netProfit') or scenario.get('netCashFlow', 0)
            ws_scenarios.cell(row=row, column=6, value=profit).number_format = '$#,##0'
            ws_scenarios.cell(row=row, column=7, value=scenario['roi']/100).number_format = '0.0%'
            ws_scenarios.cell(row=row, column=8, value=scenario['timeline'])
            
            # Highlight top 3
            if row <= 4:
                for col in range(1, 9):
                    ws_scenarios.cell(row=row, column=col).fill = PatternFill(
                        start_color="D1FAE5" if row == 2 else "FEF3C7",
                        end_color="D1FAE5" if row == 2 else "FEF3C7",
                        fill_type="solid"
                    )
        
        # Auto-width
        for col in range(1, 9):
            ws_scenarios.column_dimensions[get_column_letter(col)].width = 18
    
    # Save workbook
    wb.save(output_path)
    print(f"✅ Excel report saved: {output_path}")
    return output_path


# Example usage
if __name__ == "__main__":
    # Sample data
    sample_data = {
        "address": "405 Fairfield Cir, Fayetteville, GA 30214",
        "propertyData": {
            "purchasePrice": 318000,
            "currentSqft": 2846,
            "beds": 4,
            "baths": 3,
            "lotSize": 0.25,
            "arv": 471668
        },
        "comps": {
            "total_comps_found": 5,
            "average_price": 390180,
            "average_price_per_sqft": 165.73,
            "estimated_value": 471668,
            "comps": [
                {
                    "address": {"streetAddress": "150 Hickory Rd", "city": "Fayetteville"},
                    "price": {"value": 350000},
                    "bedrooms": 3,
                    "bathrooms": 2,
                    "livingArea": 1900,
                    "listing": {"dateSold": "2024-11-15"},
                    "distance_miles": 0.18,
                    "price_per_sqft": 184.21
                }
            ]
        },
        "scenarios": [
            {
                "name": "Wholesale Assignment",
                "purchasePrice": 318000,
                "rehabCost": 0,
                "totalCosts": 1000,
                "netProfit": 14000,
                "roi": 1400,
                "timeline": "30 days"
            }
        ]
    }
    
    # Generate reports
    generate_pdf_report(sample_data, "analysis_report.pdf")
    generate_excel_report(sample_data, "analysis_report.xlsx")
