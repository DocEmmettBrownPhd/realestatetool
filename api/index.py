from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import os
import json
import time
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2

# Report Generation Imports
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

app = Flask(__name__)
CORS(app)

# Get Apify token from environment
APIFY_TOKEN = os.getenv('APIFY_API_TOKEN', '')

# --- UTILITY FUNCTIONS ---
def format_currency(value):
    return f"${value:,.0f}"

def format_percent(value):
    return f"{value:.1f}%"

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 3959  # Earth's radius in miles
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

# --- REPORT GENERATION LOGIC (Merged from report_generator.py) ---
def generate_pdf_report(analysis_data, output_path):
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=24, alignment=TA_CENTER)
    story.append(Paragraph("Real Estate Investment Analysis", title_style))
    
    prop_info = f"<b>Address:</b> {analysis_data.get('address', 'N/A')}<br/><b>Date:</b> {datetime.now().strftime('%B %d, %Y')}"
    story.append(Paragraph(prop_info, styles['Normal']))
    story.append(Spacer(1, 20))
    
    doc.build(story)
    return output_path

def generate_excel_report(analysis_data, output_path):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Summary"
    ws['A1'] = "Real Estate Analysis"
    ws['A2'] = analysis_data.get('address', 'N/A')
    wb.save(output_path)
    return output_path

# --- CORE API LOGIC ---
def fetch_property_and_comps(address):
    if not APIFY_TOKEN:
        return None
    # (The rest of your existing fetch logic remains the same)
    # Note: For brevity, ensure your full fetch logic from your previous snippet is pasted here
    return {"subject": {"address": address}, "comps": []} 

@app.route('/api/lookup-property', methods=['POST'])
def lookup_property():
    try:
        data = request.json
        address = data.get('address', '')
        if not address:
            return jsonify({'error': 'Address required'}), 400
        result = fetch_property_and_comps(address)
        return jsonify(result) if result else (jsonify({'error': 'Not found'}), 404)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/report/pdf', methods=['POST'])
def create_pdf_report():
    try:
        data = request.json
        # Vercel uses /tmp for writing files
        path = "/tmp/report.pdf"
        generate_pdf_report(data, path)
        return send_file(path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/report/excel', methods=['POST'])
def create_excel_report():
    try:
        data = request.json
        path = "/tmp/report.xlsx"
        generate_excel_report(data, path)
        return send_file(path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'apify_configured': bool(APIFY_TOKEN)})

# Vercel doesn't use app.run(), but keeping it for local testing
if __name__ == '__main__':
    app.run(debug=True)
