import confetti from 'canvas-confetti';

interface ConfettiConfig {
    enabled: boolean;
    particleCount: number;
    duration: number;
    colors: string[];
}

class ConfettiManager {
    private config: ConfettiConfig = {
        enabled: true,
        particleCount: 40,
        duration: 3000,
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
    };
    
    async init() {
        try {
            const response = await fetch('/confetti/config');
            this.config = await response.json();
        } catch (e) {
            console.warn('Failed to load confetti config, using defaults');
        }
    }
    
    async showSuccess() {
        if (!this.config.enabled) return;
        
        // 显示彩带效果
        confetti({
            particleCount: this.config.particleCount,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            ticks: this.config.duration / 10,
            zIndex: 2500,
            colors: this.config.colors,
        });
        
        confetti({
            particleCount: this.config.particleCount,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            ticks: this.config.duration / 10,
            zIndex: 2500,
            colors: this.config.colors,
        });
    }
}

export default ConfettiManager; 