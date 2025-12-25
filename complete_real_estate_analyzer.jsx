const { useState, useEffect, useRef } = React;

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';

// Inline styles as JavaScript objects for the premium dark theme
const styles = {
    container: {
        minHeight: '100vh',
        padding: '40px 20px',
        maxWidth: '1400px',
        margin: '0 auto',
    },
    header: {
        textAlign: 'center',
        marginBottom: '50px',
        animation: 'fadeIn 0.8s ease-out',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        marginBottom: '16px',
    },
    logoIcon: {
        width: '56px',
        height: '56px',
        background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        boxShadow: '0 0 30px rgba(34, 211, 238, 0.3)',
    },
    title: {
        fontSize: '42px',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 50%, #ec4899 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '-0.02em',
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: '18px',
        fontWeight: '400',
        marginTop: '8px',
    },
    glassCard: {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        animation: 'slideUp 0.6s ease-out',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '28px',
    },
    cardIcon: {
        width: '44px',
        height: '44px',
        background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
    },
    cardTitle: {
        fontSize: '22px',
        fontWeight: '700',
        color: '#f8fafc',
    },
    inputGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
    },
    inputGroup: {
        position: 'relative',
    },
    inputGroupFull: {
        gridColumn: '1 / -1',
        position: 'relative',
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#94a3b8',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    input: {
        width: '100%',
        padding: '16px 20px',
        background: 'rgba(51, 65, 85, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '12px',
        color: '#f8fafc',
        fontSize: '16px',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 0.3s ease',
        outline: 'none',
    },
    inputFocus: {
        borderColor: '#22d3ee',
        boxShadow: '0 0 0 3px rgba(34, 211, 238, 0.1), 0 0 20px rgba(34, 211, 238, 0.1)',
    },
    addressInput: {
        width: '100%',
        padding: '20px 24px',
        paddingLeft: '56px',
        background: 'rgba(51, 65, 85, 0.5)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '16px',
        color: '#f8fafc',
        fontSize: '18px',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 0.3s ease',
        outline: 'none',
    },
    addressIcon: {
        position: 'absolute',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '20px',
        opacity: '0.6',
    },
    zestimateBox: {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(34, 211, 238, 0.15) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginTop: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    zestimateLabel: {
        color: '#10b981',
        fontSize: '14px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    zestimateValue: {
        color: '#10b981',
        fontSize: '28px',
        fontWeight: '800',
    },
    analyzeButton: {
        width: '100%',
        marginTop: '28px',
        padding: '20px 32px',
        background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '16px',
        fontSize: '18px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: '0 0 30px rgba(34, 211, 238, 0.3)',
        fontFamily: 'Inter, sans-serif',
    },
    analyzeButtonDisabled: {
        background: '#334155',
        cursor: 'not-allowed',
        boxShadow: 'none',
    },
    loadingSpinner: {
        width: '24px',
        height: '24px',
        border: '3px solid rgba(255, 255, 255, 0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    fetchingBanner: {
        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
        border: '1px solid rgba(34, 211, 238, 0.3)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginTop: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#22d3ee',
        fontSize: '15px',
        fontWeight: '500',
    },
    errorBanner: {
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#ef4444',
        fontSize: '15px',
        fontWeight: '500',
        animation: 'scaleIn 0.3s ease-out',
    },
    bestStrategyCard: {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(34, 211, 238, 0.2) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        padding: '32px',
        marginBottom: '24px',
        boxShadow: '0 0 40px rgba(16, 185, 129, 0.15)',
        animation: 'scaleIn 0.5s ease-out',
    },
    bestStrategyHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
    },
    trophyIcon: {
        fontSize: '32px',
    },
    bestStrategyTitle: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
    },
    bestStrategyName: {
        fontSize: '32px',
        fontWeight: '800',
        color: '#f8fafc',
        marginBottom: '16px',
    },
    roiGauge: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    roiBar: {
        flex: 1,
        height: '12px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        overflow: 'hidden',
    },
    roiFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #10b981 0%, #22d3ee 100%)',
        borderRadius: '6px',
        transition: 'width 1s ease-out',
    },
    roiValue: {
        fontSize: '36px',
        fontWeight: '800',
        color: '#10b981',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginTop: '24px',
    },
    statBox: {
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center',
    },
    statLabel: {
        fontSize: '12px',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '4px',
    },
    statValue: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#f8fafc',
    },
    scenariosGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
    },
    scenarioCard: {
        background: 'rgba(51, 65, 85, 0.4)',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        transition: 'all 0.3s ease',
        cursor: 'default',
        animation: 'slideUp 0.5s ease-out',
    },
    scenarioCardBest: {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(34, 211, 238, 0.15) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        boxShadow: '0 0 30px rgba(16, 185, 129, 0.1)',
    },
    scenarioRank: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: '700',
        color: 'white',
        marginBottom: '16px',
    },
    scenarioName: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: '16px',
    },
    scenarioStats: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    scenarioStat: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scenarioStatLabel: {
        fontSize: '13px',
        color: '#94a3b8',
    },
    scenarioStatValue: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#f8fafc',
    },
    scenarioRoi: {
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scenarioRoiLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#94a3b8',
    },
    scenarioRoiValue: (positive) => ({
        fontSize: '28px',
        fontWeight: '800',
        color: positive ? '#10b981' : '#ef4444',
    }),
    exportButtons: {
        display: 'flex',
        gap: '16px',
        marginTop: '32px',
    },
    exportButton: {
        flex: 1,
        padding: '18px 24px',
        borderRadius: '14px',
        border: 'none',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        transition: 'all 0.3s ease',
        fontFamily: 'Inter, sans-serif',
    },
    pdfButton: {
        background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
        color: 'white',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
    },
    excelButton: {
        background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
        color: 'white',
        boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
    },
    compsSection: {
        marginTop: '8px',
    },
    compsSummary: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
    },
    compSummaryBox: {
        background: 'rgba(51, 65, 85, 0.4)',
        borderRadius: '14px',
        padding: '20px',
        textAlign: 'center',
    },
    compSummaryLabel: {
        fontSize: '12px',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '8px',
    },
    compSummaryValue: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#f8fafc',
    },
    compsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    compItem: {
        background: 'rgba(51, 65, 85, 0.3)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid rgba(148, 163, 184, 0.08)',
    },
    compAddress: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#f8fafc',
    },
    compDetails: {
        fontSize: '13px',
        color: '#94a3b8',
        marginTop: '4px',
    },
    compPrice: {
        textAlign: 'right',
    },
    compPriceValue: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#22d3ee',
    },
    compPricePerSqft: {
        fontSize: '12px',
        color: '#94a3b8',
        marginTop: '2px',
    },
};

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
    const [focusedInput, setFocusedInput] = useState(null);
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
                    const address = place.formatted_address;

                    setPropertyData(prev => ({
                        ...prev,
                        address: address
                    }));

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
            } else {
                setError('Property not found. Please enter details manually.');
            }
        } catch (err) {
            setError('Unable to fetch property details. Please enter manually.');
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
        if (!propertyData.address || !propertyData.purchasePrice || !propertyData.currentSqft) {
            setError('Please fill in address, purchase price, and square footage');
            return;
        }

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
                setError(data.error || 'Analysis failed. Please try again.');
            }
        } catch (err) {
            setError('Cannot connect to server. Please check your connection.');
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
            a.download = `${propertyData.address.replace(/[^a-zA-Z0-9]/g, '_')}_Analysis.pdf`;
            a.click();
        } catch (err) {
            alert('PDF generation failed. Please try again.');
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
            a.download = `${propertyData.address.replace(/[^a-zA-Z0-9]/g, '_')}_Analysis.xlsx`;
            a.click();
        } catch (err) {
            alert('Excel generation failed. Please try again.');
        }
    };

    const getInputStyle = (name) => ({
        ...styles.input,
        ...(focusedInput === name ? styles.inputFocus : {})
    });

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.logo}>
                    <div style={styles.logoIcon}>🏠</div>
                    <h1 style={styles.title}>Real Estate Analyzer</h1>
                </div>
                <p style={styles.subtitle}>
                    AI-powered investment analysis with comparable sales data
                </p>
            </header>

            {/* Property Details Card */}
            <div style={styles.glassCard}>
                <div style={styles.cardHeader}>
                    <div style={styles.cardIcon}>📍</div>
                    <h2 style={styles.cardTitle}>Property Details</h2>
                </div>

                {/* Address Input */}
                <div style={styles.inputGroupFull}>
                    <label style={styles.label}>Property Address</label>
                    <div style={{ position: 'relative' }}>
                        <span style={styles.addressIcon}>🔍</span>
                        <input
                            ref={addressInputRef}
                            name="address"
                            value={propertyData.address}
                            onChange={handleInputChange}
                            placeholder="Start typing an address..."
                            style={{
                                ...styles.addressInput,
                                ...(focusedInput === 'address' ? styles.inputFocus : {})
                            }}
                            onFocus={() => setFocusedInput('address')}
                            onBlur={() => setFocusedInput(null)}
                            autoComplete="off"
                        />
                    </div>
                </div>

                {/* Fetching Banner */}
                {fetchingProperty && (
                    <div style={styles.fetchingBanner}>
                        <div style={styles.loadingSpinner}></div>
                        <span>Fetching property details from Zillow...</span>
                    </div>
                )}

                {/* Zestimate Display */}
                {propertyData.zestimate > 0 && (
                    <div style={styles.zestimateBox}>
                        <span style={styles.zestimateLabel}>Zillow Zestimate</span>
                        <span style={styles.zestimateValue}>
                            {formatCurrency(propertyData.zestimate)}
                        </span>
                    </div>
                )}

                {/* Property Fields Grid */}
                <div style={{ ...styles.inputGrid, marginTop: '24px' }}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Purchase Price ($)</label>
                        <input
                            name="purchasePrice"
                            type="number"
                            value={propertyData.purchasePrice}
                            onChange={handleInputChange}
                            placeholder="250000"
                            style={getInputStyle('purchasePrice')}
                            onFocus={() => setFocusedInput('purchasePrice')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Square Feet</label>
                        <input
                            name="currentSqft"
                            type="number"
                            value={propertyData.currentSqft}
                            onChange={handleInputChange}
                            placeholder="1800"
                            style={getInputStyle('currentSqft')}
                            onFocus={() => setFocusedInput('currentSqft')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Bedrooms</label>
                        <input
                            name="beds"
                            type="number"
                            value={propertyData.beds}
                            onChange={handleInputChange}
                            style={getInputStyle('beds')}
                            onFocus={() => setFocusedInput('beds')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Bathrooms</label>
                        <input
                            name="baths"
                            type="number"
                            step="0.5"
                            value={propertyData.baths}
                            onChange={handleInputChange}
                            style={getInputStyle('baths')}
                            onFocus={() => setFocusedInput('baths')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Year Built</label>
                        <input
                            name="yearBuilt"
                            type="number"
                            value={propertyData.yearBuilt}
                            onChange={handleInputChange}
                            style={getInputStyle('yearBuilt')}
                            onFocus={() => setFocusedInput('yearBuilt')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Lot Size (acres)</label>
                        <input
                            name="lotSize"
                            type="number"
                            step="0.01"
                            value={propertyData.lotSize}
                            onChange={handleInputChange}
                            style={getInputStyle('lotSize')}
                            onFocus={() => setFocusedInput('lotSize')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>
                </div>

                {/* Analyze Button */}
                <button
                    onClick={analyzeProperty}
                    disabled={loading}
                    style={{
                        ...styles.analyzeButton,
                        ...(loading ? styles.analyzeButtonDisabled : {})
                    }}
                    onMouseOver={(e) => {
                        if (!loading) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 0 40px rgba(34, 211, 238, 0.4)';
                        }
                    }}
                    onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 0 30px rgba(34, 211, 238, 0.3)';
                    }}
                >
                    {loading ? (
                        <>
                            <div style={styles.loadingSpinner}></div>
                            <span>Analyzing Property...</span>
                        </>
                    ) : (
                        <>
                            <span>🚀</span>
                            <span>Run Complete Analysis</span>
                        </>
                    )}
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div style={styles.errorBanner}>
                    <span>⚠️</span>
                    <span>{error}</span>
                </div>
            )}

            {/* Results Section */}
            {results && (
                <>
                    {/* Best Strategy Card */}
                    {results.best_scenario && (
                        <div style={styles.bestStrategyCard}>
                            <div style={styles.bestStrategyHeader}>
                                <span style={styles.trophyIcon}>🏆</span>
                                <span style={styles.bestStrategyTitle}>Best Investment Strategy</span>
                            </div>
                            <h3 style={styles.bestStrategyName}>{results.best_scenario.name}</h3>
                            <div style={styles.roiGauge}>
                                <div style={styles.roiBar}>
                                    <div
                                        style={{
                                            ...styles.roiFill,
                                            width: `${Math.min(Math.max(results.best_scenario.roi, 0), 100)}%`
                                        }}
                                    ></div>
                                </div>
                                <span style={styles.roiValue}>{results.best_scenario.roi}%</span>
                            </div>
                            <div style={styles.statsGrid}>
                                <div style={styles.statBox}>
                                    <div style={styles.statLabel}>Investment</div>
                                    <div style={styles.statValue}>
                                        {formatCurrency(results.best_scenario.total_investment)}
                                    </div>
                                </div>
                                <div style={styles.statBox}>
                                    <div style={styles.statLabel}>Profit</div>
                                    <div style={{ ...styles.statValue, color: results.best_scenario.profit > 0 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(results.best_scenario.profit)}
                                    </div>
                                </div>
                                <div style={styles.statBox}>
                                    <div style={styles.statLabel}>Timeline</div>
                                    <div style={styles.statValue}>
                                        {results.best_scenario.timeline_days} days
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Market Analysis */}
                    {results.comps && (
                        <div style={styles.glassCard}>
                            <div style={styles.cardHeader}>
                                <div style={styles.cardIcon}>📊</div>
                                <h2 style={styles.cardTitle}>Market Analysis</h2>
                            </div>

                            <div style={styles.compsSummary}>
                                <div style={styles.compSummaryBox}>
                                    <div style={styles.compSummaryLabel}>Comps Found</div>
                                    <div style={styles.compSummaryValue}>{results.comps.total_found}</div>
                                </div>
                                <div style={styles.compSummaryBox}>
                                    <div style={styles.compSummaryLabel}>Avg Sale Price</div>
                                    <div style={styles.compSummaryValue}>
                                        {formatCurrency(results.comps.average_price)}
                                    </div>
                                </div>
                                <div style={styles.compSummaryBox}>
                                    <div style={styles.compSummaryLabel}>Avg $/Sq Ft</div>
                                    <div style={styles.compSummaryValue}>
                                        ${results.comps.average_price_per_sqft}
                                    </div>
                                </div>
                                <div style={styles.compSummaryBox}>
                                    <div style={styles.compSummaryLabel}>Estimated ARV</div>
                                    <div style={{ ...styles.compSummaryValue, color: '#22d3ee' }}>
                                        {formatCurrency(results.comps.estimated_value)}
                                    </div>
                                </div>
                            </div>

                            {results.comps.properties && results.comps.properties.length > 0 && (
                                <div style={styles.compsList}>
                                    {results.comps.properties.map((comp, idx) => (
                                        <div key={idx} style={styles.compItem}>
                                            <div>
                                                <div style={styles.compAddress}>{comp.address}</div>
                                                <div style={styles.compDetails}>
                                                    {comp.beds} bed • {comp.baths} bath • {comp.sqft?.toLocaleString()} sqft
                                                    {comp.distance_miles && ` • ${comp.distance_miles} mi away`}
                                                </div>
                                            </div>
                                            <div style={styles.compPrice}>
                                                <div style={styles.compPriceValue}>
                                                    {formatCurrency(comp.price)}
                                                </div>
                                                <div style={styles.compPricePerSqft}>
                                                    ${comp.price_per_sqft}/sqft
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* All Scenarios */}
                    <div style={styles.glassCard}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardIcon}>💰</div>
                            <h2 style={styles.cardTitle}>Investment Scenarios</h2>
                        </div>

                        <div style={styles.scenariosGrid}>
                            {results.scenarios.map((scenario, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        ...styles.scenarioCard,
                                        ...(idx === 0 ? styles.scenarioCardBest : {}),
                                        animationDelay: `${idx * 0.1}s`
                                    }}
                                >
                                    <div style={styles.scenarioRank}>#{idx + 1}</div>
                                    <h4 style={styles.scenarioName}>{scenario.name}</h4>
                                    <div style={styles.scenarioStats}>
                                        <div style={styles.scenarioStat}>
                                            <span style={styles.scenarioStatLabel}>Investment</span>
                                            <span style={styles.scenarioStatValue}>
                                                {formatCurrency(scenario.total_investment)}
                                            </span>
                                        </div>
                                        {scenario.profit !== undefined && (
                                            <div style={styles.scenarioStat}>
                                                <span style={styles.scenarioStatLabel}>Profit</span>
                                                <span style={{
                                                    ...styles.scenarioStatValue,
                                                    color: scenario.profit > 0 ? '#10b981' : '#ef4444'
                                                }}>
                                                    {formatCurrency(scenario.profit)}
                                                </span>
                                            </div>
                                        )}
                                        <div style={styles.scenarioStat}>
                                            <span style={styles.scenarioStatLabel}>Timeline</span>
                                            <span style={styles.scenarioStatValue}>
                                                {scenario.timeline_days} days
                                            </span>
                                        </div>
                                    </div>
                                    <div style={styles.scenarioRoi}>
                                        <span style={styles.scenarioRoiLabel}>Return on Investment</span>
                                        <span style={styles.scenarioRoiValue(scenario.roi > 0)}>
                                            {scenario.roi}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Export Buttons */}
                    <div style={styles.exportButtons}>
                        <button
                            onClick={downloadPDF}
                            style={{ ...styles.exportButton, ...styles.pdfButton }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)';
                            }}
                        >
                            <span>📄</span>
                            <span>Download PDF Report</span>
                        </button>
                        <button
                            onClick={downloadExcel}
                            style={{ ...styles.exportButton, ...styles.excelButton }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)';
                            }}
                        >
                            <span>📊</span>
                            <span>Download Excel Report</span>
                        </button>
                    </div>
                </>
            )}

            {/* Footer */}
            <footer style={{
                textAlign: 'center',
                marginTop: '60px',
                padding: '20px',
                color: '#64748b',
                fontSize: '14px'
            }}>
                <p>Real Estate Investment Analyzer • Built with 💜</p>
            </footer>
        </div>
    );
}

ReactDOM.render(<RealEstateAnalyzer />, document.getElementById('root'));
