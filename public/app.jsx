const { useState, useEffect, useRef } = React;

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
    longitude: null,
    zipcode: ''
  });
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingProperty, setFetchingProperty] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps && addressInputRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' }
      });

      autocompleteRef.current.addListener('place_changed', async () => {
        const place = autocompleteRef.current.getPlace();
        if (place.formatted_address) {
          setPropertyData(prev => ({ ...prev, address: place.formatted_address }));
          await fetchPropertyDetails(place.formatted_address);
        }
      });
    }
  }, []);

  const fetchPropertyDetails = async (address) => {
    setFetchingProperty(true);
    setError(null);
    
    try {
      const response = await fetch('/api/lookup-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      const data = await response.json();
      
      if (response.ok) {
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
      }
    } catch (err) {
      console.error('Error fetching property:', err);
    } finally {
      setFetchingProperty(false);
    }
  };

  const handleInputChange = (e) => {
    setPropertyData({ ...propertyData, [e.target.name]: e.target.value });
  };

  const analyzeProperty = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/analyze', {
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
      setError('Cannot connect to API');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await fetch('/api/report/pdf', {
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
      const response = await fetch('/api/report/excel', {
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

  const getFilteredScenarios = () => {
    if (!results) return [];
    if (activeTab === 'all') return results.scenarios;
    if (activeTab === 'flip') return results.flip_scenarios || [];
    if (activeTab === 'rental') return results.rental_scenarios || [];
    return results.scenarios;
  };

  const formatCurrency = (val) => `$${(val || 0).toLocaleString()}`;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#1e293b', marginBottom: '30px' }}>Real Estate Investment Analyzer</h1>
      
      {/* Property Input Section */}
      <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#334155' }}>Property Details</h2>
        
        {fetchingProperty && (
          <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '8px', marginBottom: '15px', color: '#1d4ed8' }}>
            Loading property details...
          </div>
        )}
        
        {propertyData.zestimate > 0 && (
          <div style={{ background: '#dcfce7', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: '#166534' }}>Zillow Zestimate</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#15803d' }}>{formatCurrency(propertyData.zestimate)}</div>
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Address</label>
            <input
              ref={addressInputRef}
              name="address"
              value={propertyData.address}
              onChange={handleInputChange}
              placeholder="Start typing address..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
              autoComplete="off"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Purchase Price ($)</label>
            <input name="purchasePrice" type="number" value={propertyData.purchasePrice} onChange={handleInputChange} placeholder="250000" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Square Feet</label>
            <input name="currentSqft" type="number" value={propertyData.currentSqft} onChange={handleInputChange} placeholder="1800" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Bedrooms</label>
            <input name="beds" type="number" value={propertyData.beds} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Bathrooms</label>
            <input name="baths" type="number" step="0.5" value={propertyData.baths} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Year Built</label>
            <input name="yearBuilt" type="number" value={propertyData.yearBuilt} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#475569' }}>Lot Size (acres)</label>
            <input name="lotSize" type="number" step="0.01" value={propertyData.lotSize} onChange={handleInputChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          </div>
        </div>
        
        <button
          onClick={analyzeProperty}
          disabled={loading}
          style={{
            marginTop: '25px', padding: '14px 30px', background: loading ? '#94a3b8' : '#2563eb', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', width: '100%'
          }}
        >
          {loading ? 'Analyzing...' : 'Run Complete Analysis'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '8px', color: '#dc2626', marginBottom: '20px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      {results && (
        <>
          {/* Market Analysis */}
          <div style={{ background: '#ecfdf5', padding: '25px', borderRadius: '12px', marginBottom: '25px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#166534' }}>Market Analysis</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Comps Found</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1f2937' }}>{results.comps.total_found}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Avg Price/SqFt</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1f2937' }}>${results.comps.average_price_per_sqft}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Comp-Based ARV</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1f2937' }}>{formatCurrency(results.comps.estimated_value)}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>Zestimate</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#15803d' }}>{results.zestimate ? formatCurrency(results.zestimate) : 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Best Strategy Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            {results.best_flip && (
              <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '12px', border: '2px solid #f59e0b' }}>
                <div style={{ fontSize: '13px', color: '#92400e', marginBottom: '5px' }}>Best Flip Strategy</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#b45309' }}>{results.best_flip.name}</div>
                <div style={{ fontSize: '18px', marginTop: '8px' }}>
                  ROI: <span style={{ color: results.best_flip.roi > 0 ? '#15803d' : '#dc2626', fontWeight: '700' }}>{results.best_flip.roi}%</span>
                  <span style={{ marginLeft: '15px', color: '#6b7280' }}>Profit: {formatCurrency(results.best_flip.profit)}</span>
                </div>
              </div>
            )}
            
            {results.best_rental && (
              <div style={{ background: '#dbeafe', padding: '20px', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                <div style={{ fontSize: '13px', color: '#1e40af', marginBottom: '5px' }}>Best Rental Strategy</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#1d4ed8' }}>{results.best_rental.name}</div>
                <div style={{ fontSize: '18px', marginTop: '8px' }}>
                  Cash-on-Cash: <span style={{ color: results.best_rental.cash_on_cash > 0 ? '#15803d' : '#dc2626', fontWeight: '700' }}>{results.best_rental.cash_on_cash}%</span>
                  <span style={{ marginLeft: '15px', color: '#6b7280' }}>Monthly: {formatCurrency(results.best_rental.monthly_cash_flow)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Scenario Tabs */}
          <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {['all', 'flip', 'rental'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600',
                    background: activeTab === tab ? '#2563eb' : '#e2e8f0',
                    color: activeTab === tab ? 'white' : '#475569'
                  }}
                >
                  {tab === 'all' ? 'All Scenarios' : tab === 'flip' ? 'Flip Strategies' : 'Rental Strategies'}
                </button>
              ))}
            </div>
            
            <h2 style={{ margin: '0 0 15px 0', color: '#334155' }}>
              {activeTab === 'all' ? 'All Investment Scenarios' : activeTab === 'flip' ? 'Flip Strategies' : 'Rental Strategies'}
            </h2>
            
            {getFilteredScenarios().map((scenario, idx) => (
              <div key={idx} style={{
                background: 'white', padding: '20px', marginBottom: '12px', borderRadius: '10px',
                border: idx === 0 ? '2px solid #22c55e' : '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                      {idx === 0 && <span style={{ background: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', marginRight: '10px' }}>BEST</span>}
                      {scenario.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                      {scenario.type === 'rental' ? (
                        <>
                          Rent: {formatCurrency(scenario.monthly_rent)}/mo | 
                          Cash Flow: {formatCurrency(scenario.monthly_cash_flow)}/mo | 
                          Vacancy: {scenario.vacancy_rate}%
                        </>
                      ) : scenario.type === 'wholesale' ? (
                        <>
                          Assignment Fee: {formatCurrency(scenario.profit)} | 
                          Timeline: {scenario.timeline}
                        </>
                      ) : (
                        <>
                          Investment: {formatCurrency(scenario.total_investment)} | 
                          Profit: {formatCurrency(scenario.profit)} | 
                          Timeline: {scenario.timeline}
                        </>
                      )}
                    </div>
                    
                    {scenario.type === 'rental' && scenario.room_breakdown && (
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
                        Rooms: {scenario.room_breakdown.map((r, i) => `$${r}`).join(' + ')} = {formatCurrency(scenario.monthly_rent)}
                      </div>
                    )}
                    
                    {scenario.type === 'rental' && scenario.fmr && (
                      <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
                        FMR: {formatCurrency(scenario.fmr)} | Gov: {scenario.government_portion} | Tenant: {scenario.tenant_portion}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: scenario.roi > 0 ? '#22c55e' : '#ef4444' }}>
                      {scenario.roi}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {scenario.type === 'rental' ? 'Cash-on-Cash' : 'ROI'}
                    </div>
                    {scenario.cap_rate && (
                      <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
                        Cap Rate: {scenario.cap_rate}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Download Buttons */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button onClick={downloadPDF} style={{ flex: '1', minWidth: '200px', padding: '15px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
              Download PDF Report
            </button>
            <button onClick={downloadExcel} style={{ flex: '1', minWidth: '200px', padding: '15px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
              Download Excel Report
            </button>
          </div>
        </>
      )}
    </div>
  );
}

ReactDOM.render(<RealEstateAnalyzer />, document.getElementById('root'));
