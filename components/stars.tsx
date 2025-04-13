"use client";
import React, { useEffect, useState } from "react";

const Stars = () => {
  const [stars, setStars] = useState<React.ReactNode>(null);

  useEffect(() => {
    const numberOfStars = 100;
    const starElements = Array.from({ length: numberOfStars }).map((_, i) => {
      const left = Math.random() * window.innerWidth;
      const top = Math.random() * window.innerHeight;
      const size = Math.random() * 2 + 1;
      const duration = Math.random() * 2 + 1;

      return (
        <div
          key={i}
          className="star"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${size}px`,
            height: `${size}px`,
            animationDuration: `${duration}s`,
            position: "absolute",
            backgroundColor: "#fff",
            borderRadius: "50%",
            opacity: 0.8,
          }}
        />
      );
    });

    setStars(starElements);
  }, []);

  return <div className="stars">{stars}</div>;
};

export default Stars;
