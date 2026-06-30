let sunAnimationId = null;

function initSunArc(sunriseStr, sunsetStr) {
    const canvas = document.getElementById('sunArcCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (sunAnimationId) cancelAnimationFrame(sunAnimationId);

    function parseTimeToDecimal(timeStr) {
        if (!timeStr) return 12;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours + (minutes / 60);
    }

    const sunrise = parseTimeToDecimal(sunriseStr);
    const sunset = parseTimeToDecimal(sunsetStr);

    const now = new Date();
    const targetDecimalTime = now.getHours() + (now.getMinutes() / 60);

    let startTime = null;
    const animationDuration = 3500;

    // We store the logical width and height to use in our drawing math
    let logicalWidth, logicalHeight;

    function resizeCanvas() {
        const rect = canvas.parentNode.getBoundingClientRect();

        // Grab the display's pixel density (defaults to 1 for standard screens, 2-3 for Retina/Mobile)
        const dpr = window.devicePixelRatio || 1;

        logicalWidth = rect.width;
        logicalHeight = rect.height;

        // Multiply the actual canvas resolution by the device pixel ratio
        canvas.width = logicalWidth * dpr;
        canvas.height = logicalHeight * dpr;

        // Force the visual CSS size to perfectly fit the container
        canvas.style.width = `${logicalWidth}px`;
        canvas.style.height = `${logicalHeight}px`;

        // Scale the drawing context so all our math stays exactly the same but renders ultra-crisp!
        ctx.scale(dpr, dpr);
    }
    resizeCanvas();

    function drawTrajectoryFrame(animatedTime) {
        // Use logicalWidth and logicalHeight for clearing and math
        ctx.clearRect(0, 0, logicalWidth, logicalHeight);

        const width = logicalWidth;
        const height = logicalHeight;

        const paddingX = width < 500 ? 25 : 40;
        const graphWidth = width - (paddingX * 2);
        const baselineY = height - 40;
        const arcMaxHeight = height - (width < 500 ? 75 : 90);

        function getXCoord(decimalTime) {
            return paddingX + (decimalTime / 24) * graphWidth;
        }

        function getYCoord(decimalTime) {
            if (decimalTime >= sunrise && decimalTime <= sunset) {
                const progress = (decimalTime - sunrise) / (sunset - sunrise);
                const smoothFactor = Math.sin(progress * Math.PI);
                return baselineY - (smoothFactor * smoothFactor) * arcMaxHeight;
            } else {
                let nightProgress = 0;
                if (decimalTime > sunset) {
                    nightProgress = (decimalTime - sunset) / (24 - sunset + sunrise);
                } else {
                    nightProgress = (24 - sunset + decimalTime) / (24 - sunset + sunrise);
                }
                const smoothNightFactor = Math.sin(nightProgress * Math.PI);
                return baselineY + (smoothNightFactor * smoothNightFactor) * 12;
            }
        }

        // 1. Horizon Track Line
        ctx.beginPath();
        ctx.moveTo(paddingX, baselineY);
        ctx.lineTo(width - paddingX, baselineY);
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 2. Continuous Structural Curve 
        ctx.beginPath();
        for (let t = 0; t <= 24; t += 0.05) {
            ctx.lineTo(getXCoord(t), getYCoord(t));
        }
        ctx.strokeStyle = 'rgba(129, 140, 248, 0.25)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 3. Ambient Daylight Gradient Shade Block
        ctx.beginPath();
        ctx.moveTo(getXCoord(sunrise), baselineY);
        for (let t = sunrise; t <= sunset; t += 0.05) {
            ctx.lineTo(getXCoord(t), getYCoord(t));
        }
        ctx.lineTo(getXCoord(sunset), baselineY);
        ctx.closePath();

        let daylightGlow = ctx.createLinearGradient(0, baselineY - arcMaxHeight, 0, baselineY);
        daylightGlow.addColorStop(0, 'rgba(250, 204, 21, 0.06)');
        daylightGlow.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = daylightGlow;
        ctx.fill();

        // 4. Render Solar Track Node Orb
        const sunX = getXCoord(animatedTime);
        const sunY = getYCoord(animatedTime);
        const isDaytime = animatedTime >= sunrise && animatedTime <= sunset;
        const microPulse = Math.sin(Date.now() / 220) * 1.2;

        ctx.beginPath();
        ctx.arc(sunX, sunY, 13 + microPulse, 0, Math.PI * 2);
        ctx.fillStyle = isDaytime ? 'rgba(250, 204, 21, 0.15)' : 'rgba(192, 132, 252, 0.15)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sunX, sunY, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = isDaytime ? '#facc15' : '#c084fc';
        ctx.fill();

        // 5. Grid Markers (Will now render perfectly sharp!)
        ctx.fillStyle = 'var(--text-muted)';
        ctx.font = '500 10px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText('00:00', getXCoord(0), baselineY + 18);
        ctx.fillText('12:00', getXCoord(12), baselineY + 18);
        ctx.fillText('24:00', getXCoord(24), baselineY + 18);
    }

    function animateSunNode(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const executionProgress = Math.min(elapsed / animationDuration, 1);

        const easeOutCubic = 1 - Math.pow(1 - executionProgress, 3);
        const currentFramePosition = sunrise + (targetDecimalTime - sunrise) * easeOutCubic;

        drawTrajectoryFrame(currentFramePosition);

        if (executionProgress < 1) {
            sunAnimationId = requestAnimationFrame(animateSunNode);
        } else {
            function maintainSteadyPulse() {
                drawTrajectoryFrame(targetDecimalTime);
                sunAnimationId = requestAnimationFrame(maintainSteadyPulse);
            }
            maintainSteadyPulse();
        }
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        drawTrajectoryFrame(targetDecimalTime);
    });

    sunAnimationId = requestAnimationFrame(animateSunNode);
}

document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const city = document.getElementById('city-input').value.trim();
    if (!city) return;

    const dashboard = document.getElementById('dashboard');
    const loading = document.getElementById('loading');
    const animatedCards = document.querySelectorAll('.animate-pop');

    dashboard.classList.add('hidden');
    animatedCards.forEach(card => card.classList.remove('run-animation'));
    loading.classList.remove('hidden');

    try {
        const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Failed to fetch data");

        document.getElementById('loc-name').innerText = data.location;
        document.getElementById('loc-desc').innerText = data.desc;
        document.getElementById('temp-val').innerText = data.temp;
        document.getElementById('feels-val').innerText = data.feels_like;
        document.getElementById('hum-val').innerText = data.humidity;
        document.getElementById('wind-val').innerText = data.wind;
        document.getElementById('press-val').innerText = data.pressure;

        document.getElementById('sunrise-val').innerText = data.sunrise;
        document.getElementById('sunset-val').innerText = data.sunset;

        const aqiElement = document.getElementById('aqi-val');
        if (data.aqi_index <= 2) {
            aqiElement.innerText = `Good (${data.aqi_raw})`;
            aqiElement.style.color = "#34d399";
        } else if (data.aqi_index === 3) {
            aqiElement.innerText = `Moderate (${data.aqi_raw})`;
            aqiElement.style.color = "#facc15";
        } else {
            aqiElement.innerText = `Poor (${data.aqi_raw})`;
            aqiElement.style.color = "#f87171";
        }

        loading.classList.add('hidden');
        dashboard.classList.remove('hidden');

        setTimeout(() => {
            animatedCards.forEach(card => card.classList.add('run-animation'));
            initSunArc(data.sunrise, data.sunset);
        }, 15);

    } catch (error) {
        loading.classList.add('hidden');
        alert(error.message);
    }
});