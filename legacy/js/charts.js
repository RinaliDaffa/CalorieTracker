/* ============================================
   NutriSnap — Charts Module
   Canvas-based progress rings and charts
   ============================================ */

// ── Draw Progress Ring ──
export function drawProgressRing(canvas, percentage, color, options = {}) {
  const {
    size = 120,
    lineWidth = 10,
    bgColor = 'rgba(148, 163, 184, 0.1)',
    animate = true,
    duration = 800
  } = options;

  canvas.width = size * 2; // For retina
  canvas.height = size * 2;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2); // Retina scaling

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size - lineWidth) / 2;
  const startAngle = -Math.PI / 2; // Start from top
  const targetAngle = (percentage / 100) * Math.PI * 2;

  function draw(progress) {
    ctx.clearRect(0, 0, size, size);

    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Progress arc
    if (progress > 0) {
      const currentAngle = targetAngle * progress;

      // Create gradient for the arc
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColor(color, 30));

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + currentAngle);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow effect
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + currentAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * 0.3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  if (animate && percentage > 0) {
    let start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      draw(easedProgress);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  } else {
    draw(1);
  }
}

// ── Draw Mini Progress Bar ──
export function drawProgressBar(container, percentage, color, height = 6) {
  container.innerHTML = '';

  const bar = document.createElement('div');
  bar.style.cssText = `
    width: 100%;
    height: ${height}px;
    background: rgba(148, 163, 184, 0.1);
    border-radius: ${height}px;
    overflow: hidden;
    position: relative;
  `;

  const fill = document.createElement('div');
  const clampedPercent = Math.min(percentage, 100);
  fill.style.cssText = `
    width: 0%;
    height: 100%;
    background: ${color};
    border-radius: ${height}px;
    transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 0 8px ${color}40;
  `;

  bar.appendChild(fill);
  container.appendChild(bar);

  // Animate after render
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.width = `${clampedPercent}%`;
    });
  });
}

// ── Draw Weekly Bar Chart ──
export function drawWeeklyChart(canvas, data, options = {}) {
  const {
    width = 340,
    height = 160,
    barColor = '#10b981',
    labelColor = '#94a3b8',
    goalLine = null,
    goalColor = 'rgba(245, 158, 11, 0.5)'
  } = options;

  canvas.width = width * 2;
  canvas.height = height * 2;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  const padding = { top: 10, right: 10, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.value), goalLine || 0) * 1.15;
  const barWidth = (chartWidth / data.length) * 0.6;
  const barGap = (chartWidth / data.length) * 0.4;

  // Goal line
  if (goalLine) {
    const goalY = padding.top + chartHeight - (goalLine / maxVal) * chartHeight;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padding.left, goalY);
    ctx.lineTo(width - padding.right, goalY);
    ctx.strokeStyle = goalColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // Goal label
    ctx.font = '9px Inter';
    ctx.fillStyle = goalColor;
    ctx.textAlign = 'right';
    ctx.fillText('Goal', width - padding.right, goalY - 4);
  }

  // Bars
  data.forEach((d, i) => {
    const x = padding.left + i * (barWidth + barGap) + barGap / 2;
    const barH = (d.value / maxVal) * chartHeight;
    const y = padding.top + chartHeight - barH;

    // Bar with rounded top
    const radius = Math.min(4, barWidth / 2);
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.arcTo(x, y, x + barWidth, y, radius);
    ctx.arcTo(x + barWidth, y, x + barWidth, y + barH, radius);
    ctx.lineTo(x + barWidth, padding.top + chartHeight);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.closePath();

    // Gradient fill
    const grad = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
    grad.addColorStop(0, barColor);
    grad.addColorStop(1, adjustColor(barColor, -30) + '80');
    ctx.fillStyle = d.value > 0 ? grad : 'rgba(148, 163, 184, 0.08)';
    ctx.fill();

    // Glow
    if (d.value > 0) {
      ctx.shadowColor = barColor;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Day label
    ctx.font = '10px Inter';
    ctx.fillStyle = d.isToday ? barColor : labelColor;
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x + barWidth / 2, height - 8);

    // Value on top
    if (d.value > 0) {
      ctx.font = '9px Inter';
      ctx.fillStyle = labelColor;
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(d.value), x + barWidth / 2, y - 6);
    }
  });
}

// ── Health Score Badge ──
export function getHealthScoreEmoji(score) {
  if (score >= 9) return '🌟';
  if (score >= 7) return '✅';
  if (score >= 5) return '👍';
  if (score >= 3) return '⚠️';
  return '🔴';
}

export function getHealthScoreLabel(score) {
  if (score >= 9) return 'Excellent';
  if (score >= 7) return 'Great';
  if (score >= 5) return 'Good';
  if (score >= 3) return 'Fair';
  return 'Poor';
}

// ── Color Utility ──
function adjustColor(hex, amount) {
  const clamp = (n) => Math.max(0, Math.min(255, n));

  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }

  const r = clamp(parseInt(color.substring(0, 2), 16) + amount);
  const g = clamp(parseInt(color.substring(2, 4), 16) + amount);
  const b = clamp(parseInt(color.substring(4, 6), 16) + amount);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
