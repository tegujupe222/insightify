/**
 * Insightify Heatmap Library
 * Lightweight heatmap visualization
 */

class InsightifyHeatmap {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      radius: options.radius || 25,
      maxOpacity: options.maxOpacity || 0.8,
      minOpacity: options.minOpacity || 0.1,
      blur: options.blur || 0.85,
      ...options
    };
    
    this.canvas = null;
    this.ctx = null;
    this.data = [];
    this.max = 0;
    
    this.init();
  }

  init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1000';
    
    this.ctx = this.canvas.getContext('2d');
    
    // Add to container
    this.container.style.position = 'relative';
    this.container.appendChild(this.canvas);
    
    // Set canvas size
    this.resize();
    
    // Listen for window resize
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  setData(data) {
    this.data = data;
    this.max = Math.max(...data.map(point => point.count));
    this.draw();
  }

  addDataPoint(x, y, count = 1) {
    this.data.push({ x, y, count });
    this.max = Math.max(this.max, count);
    this.draw();
  }

  clear() {
    this.data = [];
    this.max = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw() {
    if (this.data.length === 0) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Create gradient for each point
    this.data.forEach(point => {
      const gradient = this.ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, this.options.radius
      );

      const intensity = point.count / this.max;
      const alpha = this.options.minOpacity + 
        (this.options.maxOpacity - this.options.minOpacity) * intensity;

      gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        point.x - this.options.radius,
        point.y - this.options.radius,
        this.options.radius * 2,
        this.options.radius * 2
      );
    });

    // Apply blur effect
    if (this.options.blur > 0) {
      this.applyBlur();
    }
  }

  applyBlur() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const blur = this.options.blur;

    // Simple box blur
    for (let i = 0; i < 3; i++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0, a = 0, count = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const index = (ny * width + nx) * 4;
                r += data[index];
                g += data[index + 1];
                b += data[index + 2];
                a += data[index + 3];
                count++;
              }
            }
          }
          
          const index = (y * width + x) * 4;
          data[index] = r / count;
          data[index + 1] = g / count;
          data[index + 2] = b / count;
          data[index + 3] = a / count;
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  destroy() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.InsightifyHeatmap = InsightifyHeatmap;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InsightifyHeatmap;
} 