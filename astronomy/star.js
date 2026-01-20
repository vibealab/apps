// Astrology Calculator - Main JavaScript File
// Uses astronomy-engine for precise astronomical calculations

// ============ CONSTANTS ============

const ZODIAC_SIGNS = [
    { name: 'Aries', symbol: '♈', element: 'fire' },
    { name: 'Taurus', symbol: '♉', element: 'earth' },
    { name: 'Gemini', symbol: '♊', element: 'air' },
    { name: 'Cancer', symbol: '♋', element: 'water' },
    { name: 'Leo', symbol: '♌', element: 'fire' },
    { name: 'Virgo', symbol: '♍', element: 'earth' },
    { name: 'Libra', symbol: '♎', element: 'air' },
    { name: 'Scorpio', symbol: '♏', element: 'water' },
    { name: 'Sagittarius', symbol: '♐', element: 'fire' },
    { name: 'Capricorn', symbol: '♑', element: 'earth' },
    { name: 'Aquarius', symbol: '♒', element: 'air' },
    { name: 'Pisces', symbol: '♓', element: 'water' }
];

const PLANETS = [
    { name: 'Sun', symbol: '☉', body: Astronomy.Body.Sun, color: '#FFD700' },
    { name: 'Moon', symbol: '☽', body: Astronomy.Body.Moon, color: '#C0C0C0' },
    { name: 'Mercury', symbol: '☿', body: Astronomy.Body.Mercury, color: '#87CEEB' },
    { name: 'Venus', symbol: '♀', body: Astronomy.Body.Venus, color: '#FFC0CB' },
    { name: 'Mars', symbol: '♂', body: Astronomy.Body.Mars, color: '#FF6347' },
    { name: 'Jupiter', symbol: '♃', body: Astronomy.Body.Jupiter, color: '#FFA500' },
    { name: 'Saturn', symbol: '♄', body: Astronomy.Body.Saturn, color: '#DAA520' },
    { name: 'Uranus', symbol: '♅', body: Astronomy.Body.Uranus, color: '#40E0D0' },
    { name: 'Neptune', symbol: '♆', body: Astronomy.Body.Neptune, color: '#4169E1' },
    { name: 'Pluto', symbol: '♇', body: Astronomy.Body.Pluto, color: '#8B4513' }
];

const ASPECTS = [
    { name: 'Conjunction', angle: 0, orb: 8, symbol: '☌', color: '#FFD700' },
    { name: 'Sextile', angle: 60, orb: 6, symbol: '⚹', color: '#4CAF50' },
    { name: 'Square', angle: 90, orb: 8, symbol: '□', color: '#F44336' },
    { name: 'Trine', angle: 120, orb: 8, symbol: '△', color: '#2196F3' },
    { name: 'Quincunx', angle: 150, orb: 3, symbol: '⚻', color: '#FF9800' },
    { name: 'Opposition', angle: 180, orb: 8, symbol: '☍', color: '#9C27B0' }
];

const HOUSE_NAMES = [
    'First House (Self)', 'Second House (Values)', 'Third House (Communication)',
    'Fourth House (Home)', 'Fifth House (Creativity)', 'Sixth House (Health)',
    'Seventh House (Partnerships)', 'Eighth House (Transformation)', 'Ninth House (Philosophy)',
    'Tenth House (Career)', 'Eleventh House (Community)', 'Twelfth House (Subconscious)'
];

// ============ UTILITY FUNCTIONS ============

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function radToDeg(rad) {
    return rad * 180 / Math.PI;
}

function normalizeDegree(deg) {
    if (typeof deg !== 'number' || isNaN(deg)) {
        return 0;
    }
    deg = deg % 360;
    if (deg < 0) deg += 360;
    return deg;
}

/*
function getZodiacSign(longitude) {
    const signIndex = Math.floor(longitude / 30);
    return ZODIAC_SIGNS[signIndex];
}
*/
function getZodiacSign(longitude) {
    // Add validation
    if (longitude === undefined || longitude === null || isNaN(longitude)) {
        return ZODIAC_SIGNS[0]; // Default to Aries if invalid
    }
    longitude = normalizeDegree(longitude);
    const signIndex = Math.floor(longitude / 30) % 12;
    return ZODIAC_SIGNS[signIndex];
}

function formatDegree(longitude) {
    const sign = getZodiacSign(longitude);
    const degInSign = longitude % 30;
    const deg = Math.floor(degInSign);
    const min = Math.floor((degInSign - deg) * 60);
    const sec = Math.floor(((degInSign - deg) * 60 - min) * 60);
    return `${deg}°${min}'${sec}" ${sign.symbol}`;
}

function getAngleDifference(angle1, angle2) {
    let diff = Math.abs(angle1 - angle2);
    if (diff > 180) diff = 360 - diff;
    return diff;
}

// ============ ASTRONOMICAL CALCULATIONS ============

function createObserver(lat, lon) {
    return new Astronomy.Observer(lat, lon, 0);
}

function getJulianDate(date) {
    return (date.getTime() / 86400000) + 2440587.5;
}

function calculatePlanetPositions(date, observer) {
    const positions = [];
    
    // Convert JavaScript Date to AstroTime
    const astroTime = Astronomy.MakeTime(date);
    
    for (const planet of PLANETS) {
        try {
            // Get ecliptic longitude using AstroTime
            const equ = Astronomy.Equator(planet.body, astroTime, observer, true, true);
            const ecl = Astronomy.Ecliptic(equ.vec);
            
            let longitude = ecl.elon;
            longitude = normalizeDegree(longitude);
            
            // Check for retrograde
            const nextDate = new Date(date.getTime() + 86400000);
            const nextAstroTime = Astronomy.MakeTime(nextDate);
            const nextEqu = Astronomy.Equator(planet.body, nextAstroTime, observer, true, true);
            const nextEcl = Astronomy.Ecliptic(nextEqu.vec);
            
            let isRetrograde = false;
            if (planet.name !== 'Sun' && planet.name !== 'Moon') {
                const diff = nextEcl.elon - ecl.elon;
                isRetrograde = diff < 0 || diff > 180;
            }
            
            positions.push({
                ...planet,
                longitude: longitude,
                latitude: ecl.elat,
                sign: getZodiacSign(longitude),
                degreeInSign: longitude % 30,
                formatted: formatDegree(longitude),
                retrograde: isRetrograde
            });
        } catch (e) {
            console.warn(`Error calculating ${planet.name}:`, e);
        }
    }
    
    return positions;
}

function calculateLunarNodes(date, observer) {
    try {
        // Convert to AstroTime
        const astroTime = Astronomy.MakeTime(date);
        
        // Approximate North Node calculation using lunar node theory
        const jd = getJulianDate(date);
        const T = (jd - 2451545.0) / 36525;
        
        // Mean longitude of ascending node
        let northNodeLon = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T;
        northNodeLon = normalizeDegree(northNodeLon);
        
        const southNodeLon = normalizeDegree(northNodeLon + 180);
        
        return {
            northNode: {
                name: 'North Node',
                symbol: '☊',
                longitude: northNodeLon,
                sign: getZodiacSign(northNodeLon),
                formatted: formatDegree(northNodeLon),
                color: '#9932CC',
                retrograde: true // Nodes are typically retrograde
            },
            southNode: {
                name: 'South Node',
                symbol: '☋',
                longitude: southNodeLon,
                sign: getZodiacSign(southNodeLon),
                formatted: formatDegree(southNodeLon),
                color: '#8B008B',
                retrograde: true
            }
        };
    } catch (e) {
        console.warn('Error calculating lunar nodes:', e);
        return null;
    }
}

function calculateHouses(date, lat, lon, houseSystem = 'placidus') {
    const { ASC, MC, LST, obliquity } = calculateASCMC(date, lat, lon);
    const houses = new Array(12).fill(0);
    
    // Ensure ASC and MC are valid numbers
    if (isNaN(ASC) || isNaN(MC)) {
        console.warn('Invalid ASC or MC calculated, using defaults');
        // Default to equal houses from 0 Aries
        for (let i = 0; i < 12; i++) {
            houses[i] = i * 30;
        }
        return {
            cusps: houses,
            ASC: 0,
            MC: 270,
            DSC: 180,
            IC: 90
        };
    }
    
    houses[0] = normalizeDegree(ASC); // 1st house cusp
    houses[9] = normalizeDegree(MC);  // 10th house cusp
    houses[6] = normalizeDegree(ASC + 180); // 7th house (Descendant)
    houses[3] = normalizeDegree(MC + 180);  // 4th house (IC)
    
    const oblRad = degToRad(obliquity);
    const latRad = degToRad(lat);
    
    if (houseSystem === 'wholesign') {
        // Whole Sign houses
        const ascSign = Math.floor(ASC / 30);
        for (let i = 0; i < 12; i++) {
            houses[i] = ((ascSign + i) % 12) * 30;
        }
    } else if (houseSystem === 'equal') {
        // Equal houses from Ascendant
        for (let i = 0; i < 12; i++) {
            houses[i] = normalizeDegree(ASC + (i * 30));
        }
    } else {
        // Placidus and others - use simplified interpolation
        // Calculate intermediate cusps
        const diff1 = normalizeDegree(MC - ASC);
        const diff2 = normalizeDegree(ASC + 180 - MC);
        
        // Houses 10, 11, 12, 1 (above horizon)
        houses[10] = normalizeDegree(MC + diff2 / 3);
        houses[11] = normalizeDegree(MC + 2 * diff2 / 3);
        
        // Houses 1, 2, 3, 4 (below horizon, eastern)
        houses[1] = normalizeDegree(ASC + diff1 / 3);
        houses[2] = normalizeDegree(ASC + 2 * diff1 / 3);
        
        // Opposite houses
        houses[4] = normalizeDegree(houses[10] + 180);
        houses[5] = normalizeDegree(houses[11] + 180);
        houses[7] = normalizeDegree(houses[1] + 180);
        houses[8] = normalizeDegree(houses[2] + 180);
    }
    
    return {
        cusps: houses,
        ASC: normalizeDegree(ASC),
        MC: normalizeDegree(MC),
        DSC: normalizeDegree(ASC + 180),
        IC: normalizeDegree(MC + 180)
    };
}

function calculateASCMC(date, lat, lon) {
    const jd = getJulianDate(date);
    const T = (jd - 2451545.0) / 36525;
    
    // Calculate Local Sidereal Time
    let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
    GMST = normalizeDegree(GMST);
    
    const LST = normalizeDegree(GMST + lon);
    const RAMC = LST; // Right Ascension of Medium Coeli
    
    // Calculate obliquity of ecliptic
    const obliquity = 23.439291 - 0.0130042 * T;
    const oblRad = degToRad(obliquity);
    const latRad = degToRad(lat);
    
    // Medium Coeli (Midheaven) - simpler calculation
    let MC = Math.atan2(Math.sin(degToRad(RAMC)), 
                        Math.cos(degToRad(RAMC)) * Math.cos(oblRad));
    MC = radToDeg(MC);
    
    // Adjust MC quadrant
    if (MC < 0) MC += 360;
    if (RAMC > 180) {
        if (MC < 180) MC += 180;
    } else {
        if (MC > 180) MC -= 180;
    }
    MC = normalizeDegree(MC);
    
    // Ascendant calculation
    const sinRAMC = Math.sin(degToRad(RAMC));
    const cosRAMC = Math.cos(degToRad(RAMC));
    
    let ASC = Math.atan2(cosRAMC, 
                         -(sinRAMC * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad)));
    ASC = radToDeg(ASC);
    
    // Adjust ASC quadrant
    if (ASC < 0) ASC += 360;
    // ASC should be in the eastern hemisphere relative to RAMC
    if (cosRAMC > 0 && ASC > 180) ASC -= 180;
    if (cosRAMC < 0 && ASC < 180) ASC += 180;
    ASC = normalizeDegree(ASC);
    
    return { ASC, MC, LST, obliquity };
}
/*
function calculatePlanetPositions(date, observer) {
    const positions = [];
    
    for (const planet of PLANETS) {
        try {
            // Get ecliptic longitude
            const equ = Astronomy.Equator(planet.body, date, observer, true, true);
            const ecl = Astronomy.Ecliptic(equ.vec);
            
            let longitude = ecl.elon;
            longitude = normalizeDegree(longitude);
            
            // Check for retrograde
            const nextDate = new Date(date.getTime() + 86400000);
            const nextEqu = Astronomy.Equator(planet.body, nextDate, observer, true, true);
            const nextEcl = Astronomy.Ecliptic(nextEqu.vec);
            const isRetrograde = nextEcl.elon < ecl.elon && Math.abs(nextEcl.elon - ecl.elon) < 180;
            
            positions.push({
                ...planet,
                longitude: longitude,
                latitude: ecl.elat,
                sign: getZodiacSign(longitude),
                degreeInSign: longitude % 30,
                formatted: formatDegree(longitude),
                retrograde: isRetrograde
            });
        } catch (e) {
            console.warn(`Error calculating ${planet.name}:`, e);
        }
    }
    
    return positions;
}

function calculateLunarNodes(date, observer) {
    try {
        // Calculate Moon's position at different times to find nodes
        const moonPos = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
        const moonEcl = Astronomy.Ecliptic(moonPos.vec);
        
        // Approximate North Node calculation using lunar node theory
        // The true node oscillates, so we use mean node approximation
        const jd = getJulianDate(date);
        const T = (jd - 2451545.0) / 36525;
        
        // Mean longitude of ascending node
        let northNodeLon = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T;
        northNodeLon = normalizeDegree(northNodeLon);
        
        const southNodeLon = normalizeDegree(northNodeLon + 180);
        
        return {
            northNode: {
                name: 'North Node',
                symbol: '☊',
                longitude: northNodeLon,
                sign: getZodiacSign(northNodeLon),
                formatted: formatDegree(northNodeLon),
                color: '#9932CC'
            },
            southNode: {
                name: 'South Node',
                symbol: '☋',
                longitude: southNodeLon,
                sign: getZodiacSign(southNodeLon),
                formatted: formatDegree(southNodeLon),
                color: '#8B008B'
            }
        };
    } catch (e) {
        console.warn('Error calculating lunar nodes:', e);
        return null;
    }
}

function calculateASCMC(date, lat, lon) {
    const jd = getJulianDate(date);
    const T = (jd - 2451545.0) / 36525;
    
    // Calculate Local Sidereal Time
    let GMST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
    GMST = normalizeDegree(GMST);
    
    const LST = normalizeDegree(GMST + lon);
    const RAMC = LST; // Right Ascension of Medium Coeli
    
    // Calculate obliquity of ecliptic
    const obliquity = 23.439291 - 0.0130042 * T;
    const oblRad = degToRad(obliquity);
    const latRad = degToRad(lat);
    
    // Medium Coeli (Midheaven)
    let MC = Math.atan2(Math.sin(degToRad(RAMC)), 
                        Math.cos(degToRad(RAMC)) * Math.cos(oblRad));
    MC = normalizeDegree(radToDeg(MC));
    
    // Ascendant
    const tanASC = -Math.cos(degToRad(RAMC)) / 
                   (Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(degToRad(RAMC)));
    let ASC = radToDeg(Math.atan(tanASC));
    
    // Adjust ASC quadrant
    if (Math.cos(degToRad(RAMC)) < 0) {
        ASC += 180;
    } else if (Math.sin(degToRad(RAMC)) > 0) {
        ASC += 360;
    }
    ASC = normalizeDegree(ASC);
    
    return { ASC, MC, LST, obliquity };
}

function calculateHouses(date, lat, lon, houseSystem = 'placidus') {
    const { ASC, MC, LST, obliquity } = calculateASCMC(date, lat, lon);
    const houses = new Array(12);
    
    houses[0] = ASC; // 1st house cusp
    houses[9] = MC;  // 10th house cusp
    houses[6] = normalizeDegree(ASC + 180); // 7th house (Descendant)
    houses[3] = normalizeDegree(MC + 180);  // 4th house (IC)
    
    const oblRad = degToRad(obliquity);
    const latRad = degToRad(lat);
    
    if (houseSystem === 'wholesign') {
        // Whole Sign houses
        const ascSign = Math.floor(ASC / 30);
        for (let i = 0; i < 12; i++) {
            houses[i] = ((ascSign + i) % 12) * 30;
        }
    } else if (houseSystem === 'equal') {
        // Equal houses from Ascendant
        for (let i = 0; i < 12; i++) {
            houses[i] = normalizeDegree(ASC + (i * 30));
        }
    } else if (houseSystem === 'placidus') {
        // Placidus house system (approximate)
        const RAMC_rad = degToRad(LST);
        
        // Calculate intermediate house cusps
        for (let i = 1; i <= 5; i++) {
            if (i === 3) continue; // Skip IC, already calculated
            
            let H;
            switch (i) {
                case 1: H = RAMC_rad + degToRad(30); break;
                case 2: H = RAMC_rad + degToRad(60); break;
                case 4: H = RAMC_rad + degToRad(120); break;
                case 5: H = RAMC_rad + degToRad(150); break;
            }
            
            const sinH = Math.sin(H);
            const cosH = Math.cos(H);
            
            // Simplified Placidus calculation
            let cusp = radToDeg(Math.atan2(sinH, cosH * Math.cos(oblRad) - Math.tan(latRad) * Math.sin(oblRad)));
            cusp = normalizeDegree(cusp);
            
            houses[i < 3 ? i + 9 : i] = cusp;
            houses[i < 3 ? i + 3 : i + 6] = normalizeDegree(cusp + 180);
        }
    } else if (houseSystem === 'koch') {
        // Koch house system (approximate using Placidus as base)
        for (let i = 1; i <= 5; i++) {
            if (i === 3) continue;
            const fraction = i / 6;
            const cusp = normalizeDegree(ASC + fraction * (MC - ASC + (MC < ASC ? 360 : 0)));
            houses[i < 3 ? i + 9 : i] = cusp;
            houses[i < 3 ? i + 3 : i + 6] = normalizeDegree(cusp + 180);
        }
    } else if (houseSystem === 'campanus') {
        // Campanus house system (simplified)
        for (let i = 0; i < 12; i++) {
            houses[i] = normalizeDegree(ASC + (i * 30));
        }
    } else if (houseSystem === 'regiomontanus') {
        // Regiomontanus (simplified)
        for (let i = 0; i < 12; i++) {
            houses[i] = normalizeDegree(ASC + (i * 30));
        }
    }
    
    return {
        cusps: houses,
        ASC,
        MC,
        DSC: normalizeDegree(ASC + 180),
        IC: normalizeDegree(MC + 180)
    };
}
*/

function getPlanetHouse(planetLon, houses) {
    for (let i = 0; i < 12; i++) {
        const nextHouse = (i + 1) % 12;
        let start = houses[i];
        let end = houses[nextHouse];
        
        if (end < start) end += 360;
        let pLon = planetLon;
        if (pLon < start) pLon += 360;
        
        if (pLon >= start && pLon < end) {
            return i + 1;
        }
    }
    return 1;
}

function calculateAspects(positions1, positions2 = null) {
    const aspects = [];
    const planetsToCheck = positions2 || positions1;
    const isSynastry = positions2 !== null;
    
    for (let i = 0; i < positions1.length; i++) {
        const startJ = isSynastry ? 0 : i + 1;
        for (let j = startJ; j < planetsToCheck.length; j++) {
            const p1 = positions1[i];
            const p2 = planetsToCheck[j];
            
            const diff = getAngleDifference(p1.longitude, p2.longitude);
            
            for (const aspect of ASPECTS) {
                const orbDiff = Math.abs(diff - aspect.angle);
                if (orbDiff <= aspect.orb) {
                    aspects.push({
                        planet1: p1,
                        planet2: p2,
                        aspect: aspect,
                        orb: orbDiff.toFixed(2),
                        exact: orbDiff < 1
                    });
                    break;
                }
            }
        }
    }
    
    return aspects;
}

// ============ CHART RENDERING ============

function drawChart(canvasId, positions, houses, title = '', secondaryPositions = null) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const center = size / 2;
    const outerRadius = size / 2 - 20;
    const zodiacWidth = 35;
    const houseRadius = outerRadius - zodiacWidth;
    const planetRadius = houseRadius - 50;
    const innerRadius = planetRadius - 30;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Draw background
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, outerRadius);
    gradient.addColorStop(0, '#1e2a4a');
    gradient.addColorStop(1, '#0d1421');
    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw zodiac wheel
    const signColors = {
        fire: '#ff6b6b',
        earth: '#98d8aa',
        air: '#ffd93d',
        water: '#6bcbef'
    };
    
    for (let i = 0; i < 12; i++) {
        const startAngle = degToRad(-90 + i * 30);
        const endAngle = degToRad(-90 + (i + 1) * 30);
        
        ctx.beginPath();
        ctx.arc(center, center, outerRadius, startAngle, endAngle);
        ctx.arc(center, center, houseRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = signColors[ZODIAC_SIGNS[i].element] + '40';
        ctx.fill();
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw sign symbol
        const midAngle = startAngle + (endAngle - startAngle) / 2;
        const symbolRadius = outerRadius - zodiacWidth / 2;
        const x = center + symbolRadius * Math.cos(midAngle);
        const y = center + symbolRadius * Math.sin(midAngle);
        
        ctx.font = '16px serif';
        ctx.fillStyle = signColors[ZODIAC_SIGNS[i].element];
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ZODIAC_SIGNS[i].symbol, x, y);
    }
    
    // Draw house divisions
    if (houses) {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 12; i++) {
            const angle = degToRad(-90 - houses.cusps[i]);
            
            ctx.beginPath();
            ctx.moveTo(center + innerRadius * Math.cos(angle), center + innerRadius * Math.sin(angle));
            ctx.lineTo(center + houseRadius * Math.cos(angle), center + houseRadius * Math.sin(angle));
            ctx.stroke();
            
            // House numbers
            const nextCusp = houses.cusps[(i + 1) % 12];
            let midCusp = (houses.cusps[i] + nextCusp) / 2;
            if (nextCusp < houses.cusps[i]) midCusp = normalizeDegree(midCusp + 180);
            
            const houseAngle = degToRad(-90 - midCusp);
            const houseNumRadius = innerRadius + 15;
            const hx = center + houseNumRadius * Math.cos(houseAngle);
            const hy = center + houseNumRadius * Math.sin(houseAngle);
            
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText((i + 1).toString(), hx, hy);
        }
        
        // Draw ASC/MC lines
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        
        // ASC line
        const ascAngle = degToRad(-90 - houses.ASC);
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(center + outerRadius * Math.cos(ascAngle), center + outerRadius * Math.sin(ascAngle));
        ctx.stroke();
        
        // MC line
        ctx.strokeStyle = '#7b68ee';
        const mcAngle = degToRad(-90 - houses.MC);
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(center + outerRadius * Math.cos(mcAngle), center + outerRadius * Math.sin(mcAngle));
        ctx.stroke();
    }
    
    // Draw inner circle
    ctx.beginPath();
    ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw aspects
    const aspects = calculateAspects(positions);
    ctx.globalAlpha = 0.5;
    
    for (const asp of aspects) {
        const angle1 = degToRad(-90 - asp.planet1.longitude);
        const angle2 = degToRad(-90 - asp.planet2.longitude);
        
        const x1 = center + (innerRadius - 10) * Math.cos(angle1);
        const y1 = center + (innerRadius - 10) * Math.sin(angle1);
        const x2 = center + (innerRadius - 10) * Math.cos(angle2);
        const y2 = center + (innerRadius - 10) * Math.sin(angle2);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = asp.aspect.color;
        ctx.lineWidth = asp.exact ? 2 : 1;
        ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
    
    // Draw planets
    const drawnPositions = [];
    
    for (const planet of positions) {
        let angle = degToRad(-90 - planet.longitude);
        let radius = planetRadius;
        
        // Check for conjunctions and offset if needed
        for (const drawn of drawnPositions) {
            if (getAngleDifference(planet.longitude, drawn.longitude) < 8) {
                radius -= 20;
                break;
            }
        }
        
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        
        // Planet circle
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 2 * Math.PI);
        ctx.fillStyle = planet.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Planet symbol
        ctx.font = '14px serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(planet.symbol, x, y);
        
        // Retrograde indicator
        if (planet.retrograde) {
            ctx.font = '8px sans-serif';
            ctx.fillStyle = '#ff0';
            ctx.fillText('R', x + 10, y - 10);
        }
        
        drawnPositions.push(planet);
    }
    
    // Draw secondary positions (for synastry/transit)
    if (secondaryPositions) {
        const secondaryRadius = outerRadius - 10;
        
        for (const planet of secondaryPositions) {
            const angle = degToRad(-90 - planet.longitude);
            const x = center + secondaryRadius * Math.cos(angle);
            const y = center + secondaryRadius * Math.sin(angle);
            
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = planet.color + '80';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.font = '12px serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(planet.symbol, x, y);
        }
    }
    
    // Draw title
    if (title) {
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(title, center, 15);
    }
}

// ============ UI FUNCTIONS ============

function generatePlanetTable(positions, houses) {
    let html = '<table class="planet-table"><thead><tr><th>Planet</th><th>Position</th><th>Sign</th><th>House</th></tr></thead><tbody>';
    
    for (const planet of positions) {
        const house = getPlanetHouse(planet.longitude, houses.cusps);
        const elementClass = `sign-${planet.sign.element}`;
        const retroSymbol = planet.retrograde ? ' ℞' : '';
        
        html += `<tr>
            <td><span class="planet-icon" style="color:${planet.color}">${planet.symbol}</span> ${planet.name}${retroSymbol}</td>
            <td>${planet.formatted}</td>
            <td class="${elementClass}">${planet.sign.symbol} ${planet.sign.name}</td>
            <td>${house}${getOrdinalSuffix(house)}</td>
        </tr>`;
    }
    
    html += '</tbody></table>';
    return html;
}

function generateHouseTable(houses) {
    let html = '<table class="planet-table"><thead><tr><th>House</th><th>Cusp</th><th>Sign</th></tr></thead><tbody>';
    
    for (let i = 0; i < 12; i++) {
        const cusp = houses.cusps[i];
        const sign = getZodiacSign(cusp);
        const elementClass = `sign-${sign.element}`;
        const label = i === 0 ? ' (ASC)' : i === 3 ? ' (IC)' : i === 6 ? ' (DSC)' : i === 9 ? ' (MC)' : '';
        
        html += `<tr>
            <td>${i + 1}${getOrdinalSuffix(i + 1)} House${label}</td>
            <td>${formatDegree(cusp)}</td>
            <td class="${elementClass}">${sign.symbol} ${sign.name}</td>
        </tr>`;
    }
    
    html += '</tbody></table>';
    return html;
}

function generateAspectsTable(aspects, title = 'Aspects') {
    if (aspects.length === 0) return '<p>No major aspects found.</p>';
    
    let html = `<h3 style="margin-top: 20px; margin-bottom: 10px;">${title}</h3>`;
    html += '<table class="planet-table"><thead><tr><th>Aspect</th><th>Orb</th></tr></thead><tbody>';
    
    for (const asp of aspects) {
        const aspectClass = `aspect-${asp.aspect.name.toLowerCase()}`;
        html += `<tr>
            <td>
                <span style="color:${asp.planet1.color}">${asp.planet1.symbol}</span>
                <span class="aspect-tag ${aspectClass}">${asp.aspect.symbol} ${asp.aspect.name}</span>
                <span style="color:${asp.planet2.color}">${asp.planet2.symbol}</span>
                ${asp.planet1.name} - ${asp.planet2.name}
            </td>
            <td>${asp.orb}°${asp.exact ? ' (exact)' : ''}</td>
        </tr>`;
    }
    
    html += '</tbody></table>';
    return html;
}

function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// ============ MAIN CALCULATION FUNCTIONS ============

function calculateNatalChart() {
    showLoading();
    
    setTimeout(() => {
        try {
            const name = document.getElementById('name1').value || 'Person';
            const birthdate = document.getElementById('birthdate1').value;
            const birthtime = document.getElementById('birthtime1').value;
            const lat = parseFloat(document.getElementById('lat1').value);
            const lon = parseFloat(document.getElementById('lon1').value);
            const timezone = parseFloat(document.getElementById('timezone1').value);
            const houseSystem = document.getElementById('housesystem').value;
            
            if (!birthdate) {
                alert('Please enter a birth date');
                hideLoading();
                return;
            }
            
            // Create date in UTC
            const [year, month, day] = birthdate.split('-').map(Number);
            const [hour, minute] = birthtime.split(':').map(Number);
            const utcHour = hour - timezone;
            
            const date = new Date(Date.UTC(year, month - 1, day, utcHour, minute, 0));
            
            const observer = createObserver(lat, lon);
            const positions = calculatePlanetPositions(date, observer);
            const houses = calculateHouses(date, lat, lon, houseSystem);
            const lunarNodes = calculateLunarNodes(date, observer);
            const aspects = calculateAspects(positions);
            
            // Add lunar nodes to positions
            if (lunarNodes) {
                positions.push(lunarNodes.northNode);
                positions.push(lunarNodes.southNode);
            }
            
            // Draw chart
            drawChart('chartCanvas', positions, houses, `${name}'s Birth Chart`);
            document.getElementById('secondChart').classList.add('hidden');
            
            // Generate results
            let resultsHtml = `
                <div class="info-box">
                    <strong>${name}</strong><br>
                    ${new Date(year, month - 1, day).toLocaleDateString()} at ${birthtime}<br>
                    Location: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°<br>
                    House System: ${houseSystem.charAt(0).toUpperCase() + houseSystem.slice(1)}
                </div>
                
                <details class="toggle-section" open>
                    <summary><strong>Planet Positions</strong></summary>
                    ${generatePlanetTable(positions, houses)}
                </details>
                
                <details class="toggle-section">
                    <summary><strong>House Cusps</strong></summary>
                    ${generateHouseTable(houses)}
                </details>
                
                <details class="toggle-section" open>
                    <summary><strong>Aspects</strong></summary>
                    ${generateAspectsTable(aspects)}
                </details>
            `;
            
            document.getElementById('resultsContent').innerHTML = resultsHtml;
            
            // Update legend
            updateChartLegend(positions);
            
        } catch (error) {
            console.error('Error calculating chart:', error);
            alert('Error calculating chart: ' + error.message);
        }
        
        hideLoading();
    }, 100);
}

function calculateSynastry() {
    showLoading();
    
    setTimeout(() => {
        try {
            // Person 1
            const name1 = document.getElementById('syn-name1').value || 'Person 1';
            const birthdate1 = document.getElementById('syn-birthdate1').value;
            const birthtime1 = document.getElementById('syn-birthtime1').value;
            const lat1 = parseFloat(document.getElementById('syn-lat1').value);
            const lon1 = parseFloat(document.getElementById('syn-lon1').value);
            const timezone1 = parseFloat(document.getElementById('syn-timezone1').value);
            
            // Person 2
            const name2 = document.getElementById('syn-name2').value || 'Person 2';
            const birthdate2 = document.getElementById('syn-birthdate2').value;
            const birthtime2 = document.getElementById('syn-birthtime2').value;
            const lat2 = parseFloat(document.getElementById('syn-lat2').value);
            const lon2 = parseFloat(document.getElementById('syn-lon2').value);
            const timezone2 = parseFloat(document.getElementById('syn-timezone2').value);
            
            if (!birthdate1 || !birthdate2) {
                alert('Please enter birth dates for both people');
                hideLoading();
                return;
            }
            
            // Calculate Person 1
            const [year1, month1, day1] = birthdate1.split('-').map(Number);
            const [hour1, min1] = birthtime1.split(':').map(Number);
            const date1 = new Date(Date.UTC(year1, month1 - 1, day1, hour1 - timezone1, min1, 0));
            const observer1 = createObserver(lat1, lon1);
            const positions1 = calculatePlanetPositions(date1, observer1);
            const houses1 = calculateHouses(date1, lat1, lon1, 'placidus');
            
            // Calculate Person 2
            const [year2, month2, day2] = birthdate2.split('-').map(Number);
            const [hour2, min2] = birthtime2.split(':').map(Number);
            const date2 = new Date(Date.UTC(year2, month2 - 1, day2, hour2 - timezone2, min2, 0));
            const observer2 = createObserver(lat2, lon2);
            const positions2 = calculatePlanetPositions(date2, observer2);
            const houses2 = calculateHouses(date2, lat2, lon2, 'placidus');
            
            // Calculate synastry aspects
            const synastryAspects = calculateAspects(positions1, positions2);
            const aspects1 = calculateAspects(positions1);
            const aspects2 = calculateAspects(positions2);
            
            // Draw charts
            drawChart('chartCanvas', positions1, houses1, `${name1}'s Chart`);
            document.getElementById('secondChart').classList.remove('hidden');
            drawChart('chartCanvas2', positions2, houses2, `${name2}'s Chart`);
            
            // Generate results
            let resultsHtml = `
                <div class="info-box">
                    <strong>Synastry Analysis</strong><br>
                    ${name1} ↔ ${name2}
                </div>
                
                <details class="toggle-section" open>
                    <summary><strong>Synastry Aspects (Between Charts)</strong></summary>
                    ${generateSynastryAspectsTable(synastryAspects, name1, name2)}
                </details>
                
                <details class="toggle-section">
                    <summary><strong>${name1}'s Planets</strong></summary>
                    ${generatePlanetTable(positions1, houses1)}
                </details>
                
                <details class="toggle-section">
                    <summary><strong>${name2}'s Planets</strong></summary>
                    ${generatePlanetTable(positions2, houses2)}
                </details>
                
                <details class="toggle-section">
                    <summary><strong>${name1}'s Natal Aspects</strong></summary>
                    ${generateAspectsTable(aspects1)}
                </details>
                
                <details class="toggle-section">
                    <summary><strong>${name2}'s Natal Aspects</strong></summary>
                    ${generateAspectsTable(aspects2)}
                </details>
            `;
            
            document.getElementById('resultsContent').innerHTML = resultsHtml;
            
        } catch (error) {
            console.error('Error calculating synastry:', error);
            alert('Error calculating synastry: ' + error.message);
        }
        
        hideLoading();
    }, 100);
}

function generateSynastryAspectsTable(aspects, name1, name2) {
    if (aspects.length === 0) return '<p>No major aspects found between the charts.</p>';
    
    let html = '<table class="planet-table"><thead><tr><th>' + name1 + '</th><th>Aspect</th><th>' + name2 + '</th><th>Orb</th></tr></thead><tbody>';
    
    // Sort by aspect strength
    aspects.sort((a, b) => parseFloat(a.orb) - parseFloat(b.orb));
    
    for (const asp of aspects) {
        const aspectClass = `aspect-${asp.aspect.name.toLowerCase()}`;
        html += `<tr>
            <td><span style="color:${asp.planet1.color}">${asp.planet1.symbol}</span> ${asp.planet1.name}</td>
            <td><span class="aspect-tag ${aspectClass}">${asp.aspect.symbol} ${asp.aspect.name}</span></td>
            <td><span style="color:${asp.planet2.color}">${asp.planet2.symbol}</span> ${asp.planet2.name}</td>
            <td>${asp.orb}°${asp.exact ? ' ★' : ''}</td>
        </tr>`;
    }
    
    html += '</tbody></table>';
    return html;
}

function calculateTransit() {
    showLoading();
    
    setTimeout(() => {
        try {
            // Natal data
            const name = document.getElementById('transit-name').value || 'Person';
            const birthdate = document.getElementById('transit-birthdate').value;
            const birthtime = document.getElementById('transit-birthtime').value;
            const lat = parseFloat(document.getElementById('transit-lat').value);
            const lon = parseFloat(document.getElementById('transit-lon').value);
            const timezone = parseFloat(document.getElementById('transit-timezone').value);
            
            // Transit data
            const transitDate = document.getElementById('transit-date').value;
            const transitTime = document.getElementById('transit-time').value;
            
            if (!birthdate || !transitDate) {
                alert('Please enter both birth date and transit date');
                hideLoading();
                return;
            }
            
            // Calculate Natal chart
            const [year, month, day] = birthdate.split('-').map(Number);
            const [hour, minute] = birthtime.split(':').map(Number);
            const natalDate = new Date(Date.UTC(year, month - 1, day, hour - timezone, minute, 0));
            const observer = createObserver(lat, lon);
            const natalPositions = calculatePlanetPositions(natalDate, observer);
            const houses = calculateHouses(natalDate, lat, lon, 'placidus');
            
            // Calculate Transit positions
            const [tYear, tMonth, tDay] = transitDate.split('-').map(Number);
            const [tHour, tMinute] = transitTime.split(':').map(Number);
            const transitDateObj = new Date(Date.UTC(tYear, tMonth - 1, tDay, tHour - timezone, tMinute, 0));
            const transitPositions = calculatePlanetPositions(transitDateObj, observer);
            
            // Calculate transit aspects to natal
            const transitAspects = calculateAspects(transitPositions, natalPositions);
            
            // Draw chart with transits
            drawChart('chartCanvas', natalPositions, houses, `${name}'s Natal Chart with Transits`, transitPositions);
            document.getElementById('secondChart').classList.add('hidden');
            
            // Generate results
            let resultsHtml = `
                <div class="info-box">
                    <strong>Transit Analysis for ${name}</strong><br>
                    Birth: ${new Date(year, month - 1, day).toLocaleDateString()} at ${birthtime}<br>
                    Transits: ${new Date(tYear, tMonth - 1, tDay).toLocaleDateString()} at ${transitTime}
                </div>
                
                <details class="toggle-section" open>
                    <summary><strong>Current Transit Positions</strong></summary>
                    ${generatePlanetTable(transitPositions, houses)}
                </details>
                
                <details class="toggle-section" open>
                    <summary><strong>Transit Aspects to Natal</strong></summary>
                    ${generateTransitAspectsTable(transitAspects)}
                </details>
                
                <details class="toggle-section">
                    <summary><strong>Natal Planet Positions</strong></summary>
                    ${generatePlanetTable(natalPositions, houses)}
                </details>
            `;
            
            document.getElementById('resultsContent').innerHTML = resultsHtml;
            
        } catch (error) {
            console.error('Error calculating transits:', error);
            alert('Error calculating transits: ' + error.message);
        }
        
        hideLoading();
    }, 100);
}

function generateTransitAspectsTable(aspects) {
    if (aspects.length === 0) return '<p>No major transit aspects active.</p>';
    
    let html = '<table class="planet-table"><thead><tr><th>Transit</th><th>Aspect</th><th>Natal</th><th>Orb</th></tr></thead><tbody>';
    
    aspects.sort((a, b) => parseFloat(a.orb) - parseFloat(b.orb));
    
    for (const asp of aspects) {
        const aspectClass = `aspect-${asp.aspect.name.toLowerCase()}`;
        html += `<tr>
            <td><span style="color:${asp.planet1.color}">${asp.planet1.symbol}</span> Transit ${asp.planet1.name}</td>
            <td><span class="aspect-tag ${aspectClass}">${asp.aspect.symbol} ${asp.aspect.name}</span></td>
            <td><span style="color:${asp.planet2.color}">${asp.planet2.symbol}</span> Natal ${asp.planet2.name}</td>
            <td>${asp.orb}°${asp.exact ? ' ★' : ''}</td>
        </tr>`;
    }
    
    html += '</tbody></table>';
    return html;
}

function setTransitToNow() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    
    document.getElementById('transit-date').value = dateStr;
    document.getElementById('transit-time').value = timeStr;
}

function updateChartLegend(positions) {
    const legend = document.getElementById('chartLegend');
    let html = '';
    
    for (const planet of positions.slice(0, 10)) { // Main planets only
        html += `<div class="legend-item">
            <div class="legend-color" style="background-color: ${planet.color}"></div>
            <span>${planet.symbol} ${planet.name}</span>
        </div>`;
    }
    
    legend.innerHTML = html;
}

// ============ TAB NAVIGATION ============

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Show/hide appropriate sections
        const tab = this.dataset.tab;
        
        document.getElementById('natal-input').classList.toggle('hidden', tab !== 'natal');
        document.getElementById('synastry-input').classList.toggle('hidden', tab !== 'synastry');
        document.getElementById('transit-input').classList.toggle('hidden', tab !== 'transit');
        
        // Clear results
        document.getElementById('resultsContent').innerHTML = `
            <div class="info-box">
                <p>Enter ${tab === 'natal' ? 'birth' : tab === 'synastry' ? 'both people\'s birth' : 'birth and transit'} information and click "Calculate" to see results.</p>
            </div>
        `;
        
        // Clear charts
        const canvas = document.getElementById('chartCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('secondChart').classList.add('hidden');
    });
});

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', function() {
    // Set default transit date to today
    setTransitToNow();
    
    // Hide loading
    hideLoading();
    
    console.log('Astrology Calculator initialized');
    console.log('Using astronomy-engine v' + (Astronomy.Version || 'unknown'));
});
