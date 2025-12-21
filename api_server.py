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

# Get Apify token from environment
APIFY_TOKEN = os.getenv('APIFY_API_TOKEN', '')

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in miles"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 3959  # Earth's radius in miles
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c

def fetch_subject_property(address):
    """Fetch ANY property details from Zillow by address - works for listed AND unlisted properties"""
    
    if not APIFY_TOKEN:
        print("⚠️  No Apify token - cannot fetch property details")
        return None
    
    print(f"🔍 Fetching property details for: {address}")
    
    actor_input = {
        "addresses": address  # Just the address, works for ANY property
    }
    
    try:
        # Start Apify actor - aknahin/zillow-property-info-scraper
        response = requests.post(
            'https://api.apify.com/v2/acts/aknahin~zillow-property-info-scraper/runs',
            headers={'Authorization': f'Bearer {APIFY_TOKEN}'},
            json=actor_input,
            timeout=120
        )
        
        if response.status_code != 201:
            print(f"❌ Apify error: {response.status_code}")
            return None
        
        run_data = response.json()
        run_id = run_data['data']['id']
        print(f"⏳ Fetching property details...")
        
        # Wait for completion
        for i in range(60):
            time.sleep(3)
            status_response = requests.get(
                f'https://api.apify.com/v2/actor-runs/{run_id}',
                headers={'Authorization': f'Bearer {APIFY_TOKEN}'}
            )
            status_data = status_response.json()
            status = status_data['data']['status']
            
            if status == 'SUCCEEDED':
                dataset_id = status_data['data']['defaultDatasetId']
                
                # Get results
                results_response = requests.get(
                    f'https://api.apify.com/v2/datasets/{dataset_id}/items',
                    headers={'Authorization': f'Bearer {APIFY_TOKEN}'}
                )
                
                properties = results_response.json()
                
                if properties and len(properties) > 0:
                    prop = properties[0]
                    
                    # Check for error
                    if prop.get('error'):
                        print(f"❌ Property not found: {prop['error']}")
                        return None
                    
                    # Parse address parts from full address
                    full_address = prop.get('address', address)
                    address_parts = full_address.split(',')
                    
                    # Extract city, state, zip from address
                    city = address_parts[1].strip() if len(address_parts) > 1 else ''
                    state_zip = address_parts[2].strip() if len(address_parts) > 2 else ''
                    state = state_zip.split()[0] if state_zip else ''
                    zipcode = state_zip.split()[1] if len(state_zip.split()) > 1 else ''
                    
                    # Extract property details
                    property_details = {
                        'address': full_address,
                        'city': city,
                        'state': state,
                        'zipcode': zipcode,
                        'beds': prop.get('beds', 3),
                        'baths': prop.get('baths', 2),
                        'sqft': prop.get('area', 1800),
                        'year_built': prop.get('yearBuilt', 2000),  # May not always be present
                        'lot_size': prop.get('lotSize', 0.25),  # May need conversion
                        'latitude': prop.get('latLong', {}).get('latitude'),
                        'longitude': prop.get('latLong', {}).get('longitude'),
                        'zestimate': prop.get('zestimate', 0),
                        'zpid': prop.get('zpid', ''),
                        'status': prop.get('statusText', 'Unknown'),
                        'image_url': prop.get('imgSrc', '')
                    }
                    
                    print(f"✅ Found property: {property_details['beds']}bd/{property_details['baths']}ba, {property_details['sqft']}sqft")
                    print(f"💰 Zestimate: ${property_details['zestimate']:,}")
                    print(f"📍 Status: {property_details['status']}")
                    
                    return property_details
                else:
                    print("❌ No property found at that address")
                    return None
            
            elif status == 'FAILED':
                print("❌ Apify run failed")
                return None
        
        print("⏱️  Timeout waiting for Apify")
        return None
        
    except Exception as e:
        print(f"❌ Error fetching property: {e}")
        import traceback
        traceback.print_exc()
        return None

def scrape_zillow_comps(zipcode, beds, baths, sqft, year_built):
    """Scrape Zillow using Apify with smart filtering"""
    
    if not APIFY_TOKEN:
        print("⚠️  No Apify token found - using demo data")
        return get_demo_comps(zipcode, sqft)
    
    print(f"🔍 Scraping comps for {zipcode} - {beds}bd/{baths}ba, {sqft}sqft, built {year_built}")
    
    # Calculate filter ranges
    min_year = max(1900, year_built - 10) if year_built else 1900
    max_year = (year_built + 10) if year_built else 2025
    min_sqft_range = str(int(sqft * 0.8))
    max_sqft_range = str(int(sqft * 1.2))
    
    actor_input = {
        "location": zipcode,
        "operation": "sold",
        "sortBy": "newest",
        "minBeds": max(1, beds - 1),
        "maxBeds": beds + 1,
        "minBaths": max(1, baths - 1),
        "homeTypes": ["houses"],
        "minYearBuilt": min_year,
        "maxYearBuilt": max_year,
        "minSize": min_sqft_range,
        "maxSize": max_sqft_range,
        "maxSoldDate": "6m",
        "maxItems": 30
    }
    
    print(f"📋 Filters: Year {min_year}-{max_year}, Sqft {min_sqft_range}-{max_sqft_range}")
    
    try:
        # Start Apify actor
        response = requests.post(
            'https://api.apify.com/v2/acts/igolaizola~zillow-scraper-ppe/runs',
            headers={'Authorization': f'Bearer {APIFY_TOKEN}'},
            json=actor_input,
            timeout=120
        )
        
        if response.status_code != 201:
            print(f"❌ Apify error: {response.status_code}")
            return get_demo_comps(zipcode, sqft)
        
        run_data = response.json()
        run_id = run_data['data']['id']
        print(f"⏳ Apify run started: {run_id}")
        
        # Wait for completion
        for i in range(60):
            time.sleep(3)
            status_response = requests.get(
                f'https://api.apify.com/v2/actor-runs/{run_id}',
                headers={'Authorization': f'Bearer {APIFY_TOKEN}'}
            )
            status_data = status_response.json()
            status = status_data['data']['status']
            
            if status == 'SUCCEEDED':
                dataset_id = status_data['data']['defaultDatasetId']
                
                # Get results
                results_response = requests.get(
                    f'https://api.apify.com/v2/datasets/{dataset_id}/items',
                    headers={'Authorization': f'Bearer {APIFY_TOKEN}'}
                )
                
                comps = results_response.json()
                print(f"✅ Found {len(comps)} properties from Apify")
                
                # Process comps
                processed_comps = []
                for comp in comps:
                    if (comp.get('bedrooms') and comp.get('bathrooms') and 
                        comp.get('livingArea') and comp.get('price')):
                        
                        comp['price_per_sqft'] = round(comp['price']['value'] / comp['livingArea'], 2)
                        comp['distance_miles'] = 0.0
                        processed_comps.append(comp)
                
                print(f"📍 Processed {len(processed_comps)} comps")
                return processed_comps[:10]
            
            elif status == 'FAILED':
                print("❌ Apify run failed")
                return get_demo_comps(zipcode, sqft)
        
        print("⏱️  Timeout waiting for Apify")
        return get_demo_comps(zipcode, sqft)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return get_demo_comps(zipcode, sqft)

def calculate_distances(comps, subject_lat, subject_lon):
    """Calculate distances from subject property and sort by distance"""
    if not subject_lat or not subject_lon:
        return comps
    
    for comp in comps:
        if comp.get('latitude') and comp.get('longitude'):
            distance = haversine_distance(
                subject_lat, subject_lon,
                comp['latitude'], comp['longitude']
            )
            comp['distance_miles'] = round(distance, 2)
        else:
            comp['distance_miles'] = 999
    
    # Sort by distance
    comps.sort(key=lambda x: x['distance_miles'])
    
    # Filter to 2 mile max radius
    filtered = [c for c in comps if c['distance_miles'] <= 2.0]
    
    print(f"📍 {len(filtered)} comps within 2 miles (closest: {filtered[0]['distance_miles']}mi)" if filtered else "⚠️  No comps within 2 miles")
    
    return filtered if filtered else comps[:5]

def get_demo_comps(zipcode, sqft):
    """Return demo comps when Apify unavailable"""
    base_price = 150
    
    comps = []
    for i in range(5):
        price_variation = base_price + (i * 5 - 10)
        comp_sqft = sqft + (i * 100 - 200)
        price = int(price_variation * comp_sqft)
        
        comps.append({
            'address': {
                'streetAddress': f'{1000 + i} Demo Street',
                'city': 'Jonesboro',
                'state': 'GA',
                'zipcode': zipcode
            },
            'price': {'value': price},
            'bedrooms': 3,
            'bathrooms': 2,
            'livingArea': comp_sqft,
            'yearBuilt': 2000,
            'price_per_sqft': round(price / comp_sqft, 2),
            'distance_miles': round(0.3 + i * 0.1, 2),
            'listing': {'dateSold': '2024-12-01'}
        })
    
    return comps

def calculate_scenarios(property_data, avg_price_per_sqft, estimated_arv):
    """Calculate all investment scenarios"""
    purchase = property_data['purchasePrice']
    sqft = property_data['currentSqft']
    lot_acres = property_data.get('lotSize', 0.25)
    
    scenarios = []
    
    # Fix & Flip scenarios
    rehab_costs = {
        'light': sqft * 25,
        'medium': sqft * 45,
        'heavy': sqft * 75
    }
    
    for level, rehab in rehab_costs.items():
        holding_time = 4 if level == 'light' else 6 if level == 'medium' else 8
        hard_money_rate = 0.12
        hard_money_months = holding_time
        
        interest = (purchase * 0.8) * (hard_money_rate / 12) * hard_money_months
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
            'timeline_days': holding_time * 30,
            'details': {
                'purchase': purchase,
                'rehab': round(rehab),
                'interest': round(interest),
                'closing_costs': round(closing_costs),
                'holding': round(holding_costs),
                'arv': round(estimated_arv)
            }
        })
    
    # Wholesale
    assignment_fee = purchase * 0.06
    wholesale_profit = assignment_fee
    wholesale_roi = (wholesale_profit / 1000 * 100)
    
    scenarios.append({
        'name': 'Wholesale Assignment',
        'total_investment': 1000,
        'profit': round(wholesale_profit),
        'roi': round(wholesale_roi, 1),
        'timeline_days': 30,
        'details': {
            'contract_price': purchase,
            'assignment_fee': round(assignment_fee),
            'buyer_price': round(purchase + assignment_fee)
        }
    })
    
    # Sort by ROI
    scenarios.sort(key=lambda x: x['roi'], reverse=True)
    
    return scenarios

@app.route('/api/lookup-property', methods=['POST'])
def lookup_property():
    """Auto-fetch property details from address - works for ANY property (listed or not)"""
    try:
        data = request.json
        address = data.get('address', '')
        
        if not address:
            return jsonify({'error': 'Address required'}), 400
        
        property_details = fetch_subject_property(address)
        
        if property_details:
            return jsonify(property_details)
        else:
            return jsonify({'error': 'Property not found'}), 404
            
    except Exception as e:
        print(f"❌ Error in lookup: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_property():
    """Main analysis endpoint"""
    try:
        data = request.json
        
        # Extract property details
        property_data = {
            'address': data['address'],
            'purchasePrice': float(data['purchasePrice']),
            'currentSqft': float(data['currentSqft']),
            'beds': int(data.get('beds', 3)),
            'baths': float(data.get('baths', 2)),
            'lotSize': float(data.get('lotSize', 0.25)),
            'zipcode': data.get('zipcode', data['address'].split()[-1]),
            'yearBuilt': int(data.get('yearBuilt', 2000)),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
            'zestimate': data.get('zestimate', 0)
        }
        
        print(f"\n🏠 Analyzing: {property_data['address']}")
        print(f"💰 Zestimate: ${property_data['zestimate']:,}")
        
        # Get comps with smart filtering
        comps = scrape_zillow_comps(
            property_data['zipcode'],
            property_data['beds'],
            property_data['baths'],
            property_data['currentSqft'],
            property_data['yearBuilt']
        )
        
        # Calculate distances if we have subject coords
        if property_data.get('latitude') and property_data.get('longitude'):
            comps = calculate_distances(comps, property_data['latitude'], property_data['longitude'])
        
        # Calculate averages
        avg_price = sum(c['price']['value'] for c in comps) / len(comps) if comps else 0
        avg_price_per_sqft = sum(c['price_per_sqft'] for c in comps) / len(comps) if comps else 150
        estimated_arv = avg_price_per_sqft * property_data['currentSqft']
        
        # Calculate all scenarios
        scenarios = calculate_scenarios(property_data, avg_price_per_sqft, estimated_arv)
        
        result = {
            'address': property_data['address'],
            'zestimate': property_data['zestimate'],
            'comps': {
                'total_found': len(comps),
                'average_price': round(avg_price),
                'average_price_per_sqft': round(avg_price_per_sqft, 2),
                'estimated_value': round(estimated_arv),
                'properties': comps[:5]
            },
            'scenarios': scenarios,
            'best_scenario': scenarios[0] if scenarios else None
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error in analysis: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/report/pdf', methods=['POST'])
def create_pdf_report():
    """Generate PDF report"""
    try:
        data = request.json
        filename = generate_pdf_report(data)
        return send_file(filename, as_attachment=True)
    except Exception as e:
        print(f"❌ PDF Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/report/excel', methods=['POST'])
def create_excel_report():
    """Generate Excel report"""
    try:
        data = request.json
        filename = generate_excel_report(data)
        return send_file(filename, as_attachment=True)
    except Exception as e:
        print(f"❌ Excel Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/complete_real_estate_analyzer.jsx')
def jsx_file():
    return send_file('complete_real_estate_analyzer.jsx')

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'apify_configured': bool(APIFY_TOKEN)
    })

if __name__ == '__main__':
    os.makedirs('reports', exist_ok=True)
    print("🚀 Real Estate Analyzer API Starting...")
    print(f"📊 Apify Token: {'✅ Configured' if APIFY_TOKEN else '⚠️  Not Set (demo mode)'}")
    print("=" * 60)
    app.run(debug=True, port=5000)
