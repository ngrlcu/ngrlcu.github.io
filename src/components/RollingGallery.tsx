import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useAnimation,
  useTransform,
  PanInfo,
} from "framer-motion";
import "../assets/styles/RollingGallery.scss";
import photo01 from "../assets/images/gallery/cervice_35.png";
import photo02 from "../assets/images/gallery/deathvalley_38.png";
import photo03 from "../assets/images/gallery/kjerag_73.png";
import photo04 from "../assets/images/gallery/deathvalley_10.png";
import photo05 from "../assets/images/gallery/mojave_36.png";
import photo06 from "../assets/images/gallery/sequoia_37.png";
import photo07 from "../assets/images/gallery/trolling_225.png";
import photo08 from "../assets/images/gallery/tromso_128.png";
import photo09 from "../assets/images/gallery/yosemite_13.png";


const IMGS: string[] = [
    photo01,
    photo02,
    photo03,
    photo04,
    photo05,
    photo06, 
    photo07, 
    photo08, 
    photo09    
];

interface RollingGalleryProps {
  autoplay?: boolean;
  pauseOnHover?: boolean;
  images?: string[];
}

const RollingGallery: React.FC<RollingGalleryProps> = ({
  autoplay = false,
  pauseOnHover = false,
  images = [],
}) => {
  images = IMGS;
  const [isScreenSizeSm, setIsScreenSizeSm] = useState<boolean>(
    window.innerWidth <= 640
  );

  const cylinderWidth: number = isScreenSizeSm ? 1100 : 1800;
  const faceCount: number = images.length;
  const faceWidth: number = (cylinderWidth / faceCount) * 1.5;
  const dragFactor: number = 0.05;
  const radius: number = cylinderWidth / (2 * Math.PI);

  const rotation = useMotionValue(0);
  const controls = useAnimation();
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleDrag = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ): void => {
    controls.stop();
    rotation.set(rotation.get() + info.offset.x * dragFactor);
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ): void => {
    controls.start({
      rotateY: rotation.get() + info.velocity.x * dragFactor,
      transition: {
        type: "spring",
        stiffness: 60,
        damping: 20,
        mass: 0.1,
        ease: "easeOut",
      },
    });
  };

  const transform = useTransform(rotation, (value: number) => {
    return `rotate3d(0, 1, 0, ${value}deg)`;
  });

  useEffect(() => {
    if (autoplay) {
      autoplayRef.current = setInterval(() => {
        controls.start({
          rotateY: rotation.get() - 360 / faceCount,
          transition: { duration: 2, ease: "linear" },
        });
        rotation.set(rotation.get() - 360 / faceCount);
      }, 2000);

      return () => {
        if (autoplayRef.current) clearInterval(autoplayRef.current);
      };
    }
  }, [autoplay, rotation, controls, faceCount]);

  useEffect(() => {
    const handleResize = () => {
      setIsScreenSizeSm(window.innerWidth <= 640);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseEnter = (): void => {
    if (autoplay && pauseOnHover) {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      controls.stop();
    }
  };

  const handleMouseLeave = (): void => {
    if (autoplay && pauseOnHover) {
      controls.start({
        rotateY: rotation.get() - 360 / faceCount,
        transition: { duration: 2, ease: "linear" },
      });
      rotation.set(rotation.get() - 360 / faceCount);

      autoplayRef.current = setInterval(() => {
        controls.start({
          rotateY: rotation.get() - 360 / faceCount,
          transition: { duration: 2, ease: "linear" },
        });
        rotation.set(rotation.get() - 360 / faceCount);
      }, 2000);
    }
  };

  return (
    <div className="gallery-container">
      <div className="gallery-gradient gallery-gradient-left"></div>
      <div className="gallery-gradient gallery-gradient-right"></div>
      <div className="gallery-content">
        <motion.div
          drag="x"
          className="gallery-track"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: transform,
            rotateY: rotation,
            width: cylinderWidth,
            transformStyle: "preserve-3d",
          }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={controls}
        >
          {images.map((path, i) => (
            <div
              key={i}
              className="gallery-item"
              style={{
                width: `${faceWidth}px`,
                transform: `rotateY(${(360 / faceCount) * i}deg) translateZ(${radius}px)`,
              }}
            >
              <img src={path} alt="gallery" className="gallery-img" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default RollingGallery;
