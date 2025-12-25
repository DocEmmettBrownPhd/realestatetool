from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import os
import json
import time
from datetime import datetime
from report_generator import generate_pdf_report, generate_excel_report

app = Flask(__name__)
CORS(app)

APIFY_TOKEN = os.getenv('APIFY_API_TOKEN', '')

def haversine_distance(lat1, lon1, lat2, lon2):
    from math import radians, sin, cos, sqrt, atan2
    R = 3959
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

def fetch_property_details(address):
    if not APIFY_TOKEN:
        return None
    
    try:
        response = requests.post(
            'https://api.apify.com/v2/acts/aknahin~zillow-property-info-scraper/runs',
            headers={'Authorization': f'Bearer {APIFY_TOKEN}'},
            json={"addresses": address},
            timeout=120
        )
        
        if response.status_code != 201:
            return None
        
        run_id = response.json()['data']['id']
        
        for i in range(60):
            time.sleep(2)
            status_response = requests.get(
                f'https://api.apify.com/v2/actor-runs/{run_id}',
                headers={'Authorization': f'Bearer {APIFY_TOKEN}'}
            )
            status = status_response.json()['data']['status']
            
            if status == 'SUCCEEDED':
                dataset_id = status_response.json()['data']['defaultDatasetId']
                results = requests.get(
                    f'https://api.apify.com/v2/datasets/{dataset_id}/items',
                    headers={'Authorization': f'Bearer {APIFY_TOKEN}'}
                ).json()
                
                if results and len(results) > 0:
                    prop = results[0]
                    if prop.get('error'):
                        return None
                    
                    full_address = prop.get('address', address)
                    address_parts = full_address.split(',')
                    city = address_parts[1].strip() if len(address_parts) > 1 else ''
                    state_zip = address_parts[2].strip() if len(address_parts) > 2 else ''
                    state = state_zip.split()[0] if state_zip else ''
                    zipcode = state_zip.split()[1] if len(state_zip.split()) > 1 else ''
                    
                    return {
                        'address': full_address,
                        'city': city,
                        'state': state,
                        'zipcode': zipcode,
                        'beds': prop.get('beds', 3),
                        'baths': prop.get('baths', 2),
                        'sqft': prop.get('area', 1800),
                        'year_built': prop.get('yearBuilt', 2000),
                        'lot_size': prop.get('lotSize', 0.25),
                        'latitude': prop.get('latLong', {}).get('latitude'),
                        'longitude': prop.get('latLong', {}).get('longitude'),
                        'zestimate': prop.get('zestimate', 0)
                    }
            elif status == 'FAILED':
                return None
        
        return None
    except Exception as e:
        return None

def fetch_comps(zipcode, beds, baths, sqft, year_built):
    if not APIFY_TOKEN:
        return []
    
    min_year = max(1900, year_built - 10)
    max_year = year_built + 10
    min_sqft = str(int(sqft * 0.8))
    max_sqft = str(int(sqft * 1.2))
    
    try:
        response = requests.post(
            'https://api.apify.com/v2/acts/igolaizola~zillow-scraper-ppe/runs',
            headers={'Authorization': f'Bearer {APIFY_TOKEN}'},
            json={
                "location": zipcode,
                "operation": "sold",
                "sortBy": "newest",
                "minBeds": max(1, beds - 1),
                "maxBeds": beds + 1,
                "minBaths": max(1, baths - 1),
                "homeTypes": ["houses"],
                "minYearBuilt": min_year,
                "maxYearBuilt": max_year,
                "minSize": min_sqft,
                "maxSize": max_sqft,
                "maxSoldDate": "6m",
                "maxItems": 30
            },
            timeout=120
        )
        
        if response.status_code != 201:
            return []
        
        run_id = response.json()['data']['id']
        
        for i in range(60):
            time.sleep(2)
            status_response = requests.get(
                f'https://api.apify.com/v2/actor-runs/{run_id}',
                headers={'Authorization': f'Bearer {APIFY_TOKEN}'}
            )
            status = status_response.json()['data']['status']
            
            if status == 'SUCCEEDED':
                dataset_id = status_response.json()['data']['defaultDatasetId']
                results = requests.get(
                    f'https://api.apify.com/v2/datasets/{dataset_id}/items',
                    headers={'Authorization': f'Bearer {APIFY_TOKEN}'}
                ).json()
                
                comps = []
                for comp in results:
                    if comp.get('bedrooms') and comp.get('bathrooms') and comp.get('livingArea') and comp.get('price'):
                        comps.append({
                            'address': comp.get('address', {}).get('streetAddress', 'Unknown'),
                            'price': comp['price']['value'],
                            'beds': comp['bedrooms'],
                            'baths': comp['bathrooms'],
                            'sqft': comp['livingArea'],
                            'year_built': comp.get('yearBuilt', 0),
                            'price_per_sqft': round(comp['price']['value'] / comp['livingArea'], 2),
                            'latitude': comp.get('latitude'),
                            'longitude': comp.get('longitude')
                        })
                
                return comps
            elif status == 'FAILED':
                return []
        
        return []
    except Exception as e:
        return []

@app.route('/api/lookup-property', methods=['POST'])
def lookup_property():
    data = request.json
    address = data.get('address', '')
    
    if not address:
        return jsonify({'error': 'Address required'}), 400
    
    result = fetch_property_details(address)
    
    if result:
        return jsonify(result)
    else:
        return jsonify({'error': 'Property not found'}), 404

@app.route('/api/analyze', methods=['POST'])
def analyze_property():
    data = request.json
    
    property_data = {
        'address': data['address'],
        'purchasePrice': float(data['purchasePrice']),
        'currentSqft': float(data['currentSqft']),
        'beds': int(data.get('beds', 3)),
        'baths': float(data.get('baths', 2)),
        'lotSize': float(data.get('lotSize', 0.25)),
        'zipcode': data.get('zipcode', ''),
        'yearBuilt': int(data.get('yearBuilt', 2000)),
        'latitude': data.get('latitude'),
        'longitude': data.get('longitude')
    }
    
    comps = fetch_comps(
        property_data['zipcode'],
        property_data['beds'],
        property_data['baths'],
        property_data['currentSqft'],
        property_data['yearBuilt']
    )
    
    if property_data.get('latitude') and property_data.get('longitude'):
        for comp in comps:
            if comp.get('latitude') and comp.get('longitude'):
                comp['distance_miles'] = round(haversine_distance(
                    property_data['latitude'], property_data['longitude'],
                    comp['latitude'], comp['longitude']
                ), 2)
        
        comps = [c for c in comps if c.get('distance_miles', 999) <= 2.0]
        comps.sort(key=lambda x: x.get('distance_miles', 999))
    
    if comps:
        avg_price = sum(c['price'] for c in comps) / len(comps)
        avg_price_per_sqft = sum(c['price_per_sqft'] for c in comps) / len(comps)
    else:
        avg_price = property_data['purchasePrice']
        avg_price_per_sqft = 150
    
    estimated_arv = avg_price_per_sqft * property_data['currentSqft']
    
    scenarios = []
    purchase = property_data['purchasePrice']
    sqft = property_data['currentSqft']
    
    rehab_costs = {'light': sqft * 25, 'medium': sqft * 45, 'heavy': sqft * 75}
    
    for level, rehab in rehab_costs.items():
        holding_time = 4 if level == 'light' else 6 if level == 'medium' else 8
        interest = (purchase * 0.8) * (0.12 / 12) * holding_time
        closing_costs = estimated_arv * 0.06
        holding_costs = holding_time * 500
        
        total_investment = purchase + rehab + interest + closing_costs + holding_costs
        sale_proceeds = estimated_arv * 0.94
        profit = sale_proceeds - total_investment
        roi = (profit / total_investment * 100) if total_investment > 0 else 0
        
        scenarios.append({
            'name': f'Fix & Flip ({level.title()})',
            'total_investment': round(total_investment),
            'sale_proceeds': round(sale_proceeds),
            'profit': round(profit),
            'roi': round(roi, 1),
            'timeline_days': holding_time * 30
        })
    
    assignment_fee = purchase * 0.06
    scenarios.append({
        'name': 'Wholesale Assignment',
        'total_investment': 1000,
        'profit': round(assignment_fee),
        'roi': round((assignment_fee / 1000 * 100), 1),
        'timeline_days': 30
    })
    
    scenarios.sort(key=lambda x: x['roi'], reverse=True)
    
    return jsonify({
        'address': property_data['address'],
        'comps': {
            'total_found': len(comps),
            'average_price': round(avg_price),
            'average_price_per_sqft': round(avg_price_per_sqft, 2),
            'estimated_value': round(estimated_arv),
            'properties': comps[:5]
        },
        'scenarios': scenarios,
        'best_scenario': scenarios[0] if scenarios else None
    })

@app.route('/api/report/pdf', methods=['POST'])
def create_pdf_report():
    data = request.json
    filename = generate_pdf_report(data)
    return send_file(filename, as_attachment=True)

@app.route('/api/report/excel', methods=['POST'])
def create_excel_report():
    data = request.json
    filename = generate_excel_report(data)
    return send_file(filename, as_attachment=True)

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/complete_real_estate_analyzer.jsx')
def jsx_file():
    return send_file('complete_real_estate_analyzer.jsx')

if __name__ == '__main__':
    os.makedirs('reports', exist_ok=True)
    app.run(debug=True, port=5000)
