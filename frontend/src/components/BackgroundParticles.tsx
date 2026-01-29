
import React, { useEffect, useState } from 'react';

const StarParticle: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
    <div
        className="absolute animate-fall"
        style={{
            clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
            background: "white",
            ...style
        }}
    />
);

const BackgroundParticles: React.FC = () => {
    const [stars, setStars] = useState<Array<{ id: number; style: React.CSSProperties }>>([]);

    useEffect(() => {
        // Generate stars
        const count = 50;
        const newStars = Array.from({ length: count }).map((_, i) => {
            const size = Math.random() * 15 + 5; // 5px - 20px (Larger than before)
            const duration = Math.random() * 20 + 10; // 10-30s (Faster fall)
            const delay = Math.random() * -30;
            const opacity = Math.random() * 0.4 + 0.2; // 20% - 60% Opacity (Visible!)

            // Bright Cyan/White colors
            const colors = ['#67e8f9', '#22d3ee', '#ffffff', '#cffafe'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            return {
                id: i,
                style: {
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * -20}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    opacity: opacity,
                    boxShadow: `0 0 ${size}px ${color}`, // Strong Glow
                    zIndex: Math.random() > 0.5 ? 0 : -1, // Some layered
                }
            };
        });
        setStars(newStars);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-gradient-to-br from-[#020617] via-[#082f49] to-[#164e63]">
            {/* 
                Deep Dark Blue/Cyan Theme
            */}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/60" />

            {/* Falling Stars */}
            {stars.map((star) => (
                <StarParticle key={star.id} style={star.style} />
            ))}
        </div>
    );
};

export default BackgroundParticles;
