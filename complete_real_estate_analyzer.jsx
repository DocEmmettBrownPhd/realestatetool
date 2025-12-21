const { useState, useEffect, useRef } = React;

const API_URL = 'http://localhost:5000';

function RealEstateAnalyzer() {
  const [propertyData, setPropertyData] = useState({
    address: '',
    purchasePrice: '',
    currentSqft: '',
    beds: '3',
    baths: '2',
    lotSize: '0.25',
    yearBuilt: '2000',
    zestimate: 0,
    latitude: null,
    longitude: null
  });
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingProperty, setFetchingProperty] = useState(false);
  const [error, setError] = useState(null);
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (window.google && window.google.maps && addressInputRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' }
      });

      autocompleteRef.current.addListener('place_changed', async () => {
        const place = autocompleteRef.current.getPlace();
        if (place.formatted_address) {
          const address = place.formatted_address;
          
          setPropertyData(prev => ({
            ...prev,
            address: address
          }));
          
          // Auto-fetch property details
          await fetchPropertyDetails(address);
        }
      });
    }
  }, []);

  const fetchPropertyDetails = async (address) => {
    setFetchingProperty(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/lookup-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Auto-fill form with property details
        setPropertyData(prev => ({
          ...prev,
          currentSqft: data.sqft || prev.currentSqft,
          beds: data.beds || prev.beds,
          baths: data.baths || prev.baths,
          lotSize: data.lot_size || prev.lotSize,
          yearBuilt: data.year_built || prev.yearBuilt,
          zestimate: data.zestimate || 0,
          latitude: data.latitude,
          longitude: data.longitude,
          zipcode: data.zipcode
        }));
        
        console.log('✅ Property details loaded:', data);
      } else {
        console.warn('⚠️ Property not found, using manual entry');
      }
    } catch (err) {
      console.error('Error fetching property:', err);
    } finally {
      setFetchingProperty(false);
    }
  };

  const handleInputChange = (e) => {
    setPropertyData({
      ...propertyData,
      [e.target.name]: e.target.value
    });
  };

  const analyzeProperty = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Cannot connect to API. Make sure api_server.py is running!');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await fetch(`${API_URL}/api/report/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${propertyData.address.replace(/\s/g, '_')}_Analysis.pdf`;
      a.click();
    } catch (err) {
      alert('PDF generation failed');
    }
  };

  const downloadExcel = async () => {
    try {
      const response = await fetch(`${API_URL}/api/report/excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${propertyData.address.replace(/\s/g, '_')}_Analysis.xlsx`;
      a.click();
    } catch (err) {
      alert('Excel generation failed');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>Real Estate Investment Analyzer</h1>
      
      <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Property Details</h2>
        
        {fetchingProperty && (
          <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '4px', marginBottom: '15px', color: '#1976d2' }}>
            Loading property details...
          </div>
        )}
        
        {propertyData.zestimate > 0 && (
          <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Zillow Zestimate</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2e7d32' }}>
              ${propertyData.zestimate.toLocaleString()}
            </div>
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Address</label>
            <input
              ref={addressInputRef}
              name="address"
              value={propertyData.address}
              onChange={handleInputChange}
              placeholder="Start typing address..."
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              autoComplete="off"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Purchase Price ($)</label>
            <input
              name="purchasePrice"
              type="number"
              value={propertyData.purchasePrice}
              onChange={handleInputChange}
              placeholder="250000"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Square Feet</label>
            <input
              name="currentSqft"
              type="number"
              value={propertyData.currentSqft}
              onChange={handleInputChange}
              placeholder="1800"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Bedrooms</label>
            <input
              name="beds"
              type="number"
              value={propertyData.beds}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Bathrooms</label>
            <input
              name="baths"
              type="number"
              step="0.5"
              value={propertyData.baths}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Year Built</label>
            <input
              name="yearBuilt"
              type="number"
              value={propertyData.yearBuilt}
              onChange={handleInputChange}
              placeholder="2000"
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Lot Size (acres)</label>
            <input
              name="lotSize"
              type="number"
              step="0.01"
              value={propertyData.lotSize}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
        </div>
        
        <button
          onClick={analyzeProperty}
          disabled={loading}
          style={{
            marginTop: '20px',
            padding: '12px 30px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            width: '100%'
          }}
        >
          {loading ? 'Analyzing...' : 'Run Complete Analysis'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee', padding: '15px', borderRadius: '8px', color: '#c33', marginBottom: '20px' }}>
          ERROR: {error}
        </div>
      )}

      {results && (
        <>
          <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h2>Market Analysis</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>Comps Found</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{results.comps.total_found}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>Avg Price/SqFt</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${results.comps.average_price_per_sqft}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>Comp-Based ARV</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${results.comps.estimated_value.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>Zestimate</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                  ${results.zestimate ? results.zestimate.toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h2>Best Investment Strategy</h2>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
              {results.best_scenario.name}
            </div>
            <div style={{ fontSize: '18px', marginTop: '10px' }}>
              ROI: <span style={{ color: results.best_scenario.roi > 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                {results.best_scenario.roi}%
              </span>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h2>All Investment Scenarios</h2>
            {results.scenarios.map((scenario, idx) => (
              <div key={idx} style={{
                background: 'white',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '8px',
                border: idx === 0 ? '2px solid #4caf50' : '1px solid #ddd'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{scenario.name}</div>
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                      Investment: ${scenario.total_investment.toLocaleString()}
                      {scenario.profit && ` | Profit: $${scenario.profit.toLocaleString()}`}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: scenario.roi > 0 ? '#4caf50' : '#f44336'
                  }}>
                    {scenario.roi}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={downloadPDF}
              style={{
                flex: 1,
                padding: '15px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Download PDF Report
            </button>
            <button
              onClick={downloadExcel}
              style={{
                flex: 1,
                padding: '15px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Download Excel Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}

ReactDOM.render(<RealEstateAnalyzer />, document.getElementById('root'));
