import React, { useEffect, useRef, useState } from "react";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Button } from "../../ui";
import TipCard from "./TipCard";

const MAX_CARD = 340;
const MIN_CARD = 220;
/** Room kept at both ends so a neighbouring card peeks in */
const PEEK = 56;

/**
 * Centred carousel: the active card sits in the middle with its neighbours partly visible on
 * either side. Works with the Previous and Next buttons, the dots, a press on a neighbouring card
 * and the arrow keys when the carousel has focus. The track moves with a transform only (220ms,
 * none under reduced motion).
 *
 * Props: tips [{ id, title, description, Icon }]
 */
const TipsCarousel = ({ tips }) => {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const viewRef = useRef(null);

  // The card width follows the room the carousel has (a phone gets a narrower card)
  useEffect(() => {
    const node = viewRef.current;
    if (!node) return undefined;
    const measure = () => setWidth(node.clientWidth);
    measure();
    if (typeof ResizeObserver !== "function") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const cardWidth = width > 0 ? Math.min(MAX_CARD, Math.max(MIN_CARD, width - PEEK)) : MAX_CARD;
  const go = (next) => setIndex(Math.min(tips.length - 1, Math.max(0, next)));

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
  };

  return (
    <div className="sxs-carousel">
      <div
        ref={viewRef}
        className="sxs-carousel__view"
        role="region"
        aria-roledescription="carousel"
        aria-label="Tips for taking the test"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="sxs-carousel__track" style={{ "--sxs-tip-w": `${cardWidth}px`, "--sxs-index": index }}>
          {tips.map((tip, i) => (
            <TipCard key={tip.id} tip={tip} position={i + 1} total={tips.length} active={i === index} onSelect={() => go(i)} />
          ))}
        </div>
      </div>

      <div className="sxs-carousel__controls">
        <Button size="sm" startIcon={<CaretLeftIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => go(index - 1)} disabled={index === 0}>
          Previous
        </Button>

        <div className="sxs-dots">
          {tips.map((tip, i) => (
            <button
              key={tip.id}
              type="button"
              className="sxs-dot"
              onClick={() => go(i)}
              aria-label={`Go to tip ${i + 1}: ${tip.title}`}
              aria-current={i === index ? "true" : undefined}
              data-active={i === index ? "true" : "false"}
            >
              <span className="sxs-dot__bar" aria-hidden="true" />
            </button>
          ))}
        </div>

        <Button size="sm" endIcon={<CaretRightIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => go(index + 1)} disabled={index === tips.length - 1}>
          Next
        </Button>
      </div>

      <span className="sx-sr" aria-live="polite">
        Tip {index + 1} of {tips.length}: {tips[index].title}
      </span>
    </div>
  );
};

export default TipsCarousel;
