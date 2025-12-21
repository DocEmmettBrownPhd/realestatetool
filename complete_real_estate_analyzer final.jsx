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
    rent_zestimate: 0,
    latitude: null,
    longitude: null,
    zillow_url: '',
    image_url: '',
    status: ''
  });
  
  const [compsData, setCompsData] = useState([]);
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
          
          // Auto-fetch property details AND comps in one call
          await fetchPropertyAndComps(address);
        }
      });
    }
  }, []);

  const fetchPropertyAndComps = async (address) => {
    setFetchingProperty(true);
    setError(null);
    setCompsData([]);
    
    try {
      const response = await fetch(`${API_URL}/api/lookup-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Set subject property data
        const subject = data.subject;
        setPropertyData(prev => ({
          ...prev,
          currentSqft: subject.sqft || prev.currentSqft,
          beds: subject.beds || prev.beds,
          baths: subject.baths || prev.baths,
          lotSize: subject.lot_size || prev.lotSize,
          yearBuilt: subject.year_built || prev.yearBuilt,
          zestimate: subject.zestimate || 0,
          rent_zestimate: subject.rent_zestimate || 0,
          latitude: subject.latitude,
          longitude: subject.longitude,
          zipcode: subject.zipcode,
          zillow_url: subject.zillow_url || '',
          image_url: subject.image_url || '',
          status: subject.status || ''
        }));
        
        // Set comps data
        setCompsData(data.comps || []);
        
        console.log('✅ Property + comps loaded:', data);
      } else {
        console.warn('⚠️ Property not found');
        setError('Property not found. Please enter details manually.');
      }
    } catch (err) {
      console.error('Error fetching property:', err);
      setError('Unable to fetch property details. Please try again.');
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
      // Include comps data in analysis request
      const analysisData = {
        ...propertyData,
        comps: compsData
      };
      
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Cannot connect to API. Make sure the server is running!');
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
        <h2>Property Lookup</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Address</label>
          <input
            ref={addressInputRef}
            name="address"
            value={propertyData.address}
            onChange={handleInputChange}
            placeholder="Start typing address..."
            style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
            autoComplete="off"
          />
        </div>
        
        {fetchingProperty && (
          <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '4px', color: '#1976d2', textAlign: 'center' }}>
            🔍 Loading property details and comparable sales...
          </div>
        )}
      </div>

      {propertyData.zestimate > 0 && (
        <>
          {/* Subject Property Card */}
          <div style={{ background: '#fff', border: '2px solid #4caf50', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <h2 style={{ marginTop: 0, color: '#2e7d32' }}>Subject Property</h2>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
              {propertyData.image_url && (
                <a href={propertyData.zillow_url} target="_blank" rel="noopener noreferrer">
                  <img 
                    src={propertyData.image_url} 
                    alt="Property" 
                    style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                  />
                </a>
              )}
              
              <div style={{ flex: 1 }}>
                <a 
                  href={propertyData.zillow_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2', textDecoration: 'none' }}
                >
                  {propertyData.address} →
                </a>
                
                <div style={{ fontSize: '16px', color: '#666', marginTop: '8px' }}>
                  {propertyData.beds} bed • {propertyData.baths} bath • {propertyData.currentSqft.toLocaleString()} sqft • Built {propertyData.yearBuilt}
                </div>
                
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  Lot: {propertyData.lotSize} acres • {propertyData.status}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                  <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>Zestimate</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                      ${propertyData.zestimate.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      ${Math.round(propertyData.zestimate / propertyData.currentSqft)}/sqft
                    </div>
                  </div>
                  
                  {propertyData.rent_zestimate > 0 && (
                    <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#666' }}>Rent Zestimate</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                        ${propertyData.rent_zestimate.toLocaleString()}/mo
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Est. gross yield: {((propertyData.rent_zestimate * 12 / propertyData.zestimate) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Comps Summary */}
          {compsData.length > 0 && (
            <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h2 style={{ marginTop: 0 }}>Comparable Sales</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Properties Found</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{compsData.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Distance Range</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {Math.min(...compsData.map(c => c.distance_miles)).toFixed(1)}-{Math.max(...compsData.map(c => c.distance_miles)).toFixed(1)} mi
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Avg Price</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    ${Math.round(compsData.reduce((sum, c) => sum + c.price, 0) / compsData.length).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Avg $/SqFt</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    ${Math.round(compsData.reduce((sum, c) => sum + c.price_per_sqft, 0) / compsData.length)}
                  </div>
                </div>
              </div>

              {/* Comps Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Property</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Distance</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Sold Date</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Price</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>$/SqFt</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Bed/Ba</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compsData.slice(0, 10).map((comp, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {comp.image_url && (
                              <a href={comp.zillow_url} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={comp.image_url} 
                                  alt="Comp" 
                                  style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                                />
                              </a>
                            )}
                            <div>
                              <a 
                                href={comp.zillow_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#1976d2', textDecoration: 'none', fontWeight: '500' }}
                              >
                                {comp.address} →
                              </a>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {comp.city}, {comp.state} {comp.zipcode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{comp.distance_miles} mi</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{comp.sold_date}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                          ${comp.price.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>${comp.price_per_sqft}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{comp.beds}/{comp.baths}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Purchase Price Input */}
          <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>Enter Purchase Price to Analyze</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Purchase Price ($)</label>
                <input
                  name="purchasePrice"
                  type="number"
                  value={propertyData.purchasePrice}
                  onChange={handleInputChange}
                  placeholder="250000"
                  style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
                />
              </div>
              
              <button
                onClick={analyzeProperty}
                disabled={loading || !propertyData.purchasePrice}
                style={{
                  padding: '12px 30px',
                  background: loading || !propertyData.purchasePrice ? '#ccc' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: loading || !propertyData.purchasePrice ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <div style={{ background: '#fee', padding: '15px', borderRadius: '8px', color: '#c33', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {results && (
        <>
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
