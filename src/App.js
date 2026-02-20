import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [imageUrl, setImageUrl] = useState('');
  const [displayUrl, setDisplayUrl] = useState('');
  const [currentCoordinates, setCurrentCoordinates] = useState([]);
  const [savedPolygons, setSavedPolygons] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const imageContainerRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const imgParam = params.get('img');
    if (imgParam) {
      const decodedUrl = decodeURIComponent(imgParam);
      setImageUrl(decodedUrl);
      setDisplayUrl(decodedUrl);
    }
  }, []);

  const handleLoadImage = () => {
    setDisplayUrl(imageUrl);
    setCurrentCoordinates([]);
    setSavedPolygons([]);
    setImgDimensions({ width: 0, height: 0 });
  };

  const handleImageLoad = (e) => {
    setImgDimensions({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
  };

  const formatCoordinatesArray = () => {
    const currentPolygon = currentCoordinates.map(coord => [coord.x, coord.y]);
    const allPolygons = [...savedPolygons.map(poly => poly.map(coord => [coord.x, coord.y]))];
    if (currentPolygon.length > 0) {
      allPolygons.push(currentPolygon);
    }
    return JSON.stringify(allPolygons);
  };

  const handleImageClick = (e) => {
    // Only add new point if we're not dragging
    if (!isDragging && imgDimensions.width > 0) {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const scaleX = imgDimensions.width / rect.width;
      const scaleY = imgDimensions.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      setCurrentCoordinates([...currentCoordinates, { x: Math.round(x), y: Math.round(y) }]);
    }
  };

  const startDragging = useCallback((index, e) => {
    setIsDragging(true);
    setDragIndex(index);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && dragIndex !== null && imgDimensions.width > 0) {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const scaleX = imgDimensions.width / rect.width;
      const scaleY = imgDimensions.height / rect.height;
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      
      setCurrentCoordinates(coords => {
        const newCoords = [...coords];
        newCoords[dragIndex] = { x: Math.round(x * scaleX), y: Math.round(y * scaleY) };
        return newCoords;
      });
    }
  }, [isDragging, dragIndex, imgDimensions]);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
    setDragIndex(null);
  }, []);

  const createPolygonPoints = (coords) => {
    return coords.map(coord => `${coord.x},${coord.y}`).join(' ');
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && currentCoordinates.length > 2) {
        setSavedPolygons([...savedPolygons, currentCoordinates]);
        setCurrentCoordinates([]);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setCurrentCoordinates([]);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('keydown', handleKeyDown);
      
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentCoordinates, savedPolygons]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
    };
  }, [handleMouseMove, stopDragging]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>TF Editor</h1>
        <div className="input-container">
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter image URL"
          />
          <button onClick={handleLoadImage}>Load Image</button>
          <select 
            value={zoom} 
            onChange={(e) => setZoom(Number(e.target.value))} 
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value={100}>100%</option>
            <option value={75}>75%</option>
            <option value={50}>50%</option>
            <option value={25}>25%</option>
          </select>
        </div>
        {displayUrl && (
          <div 
            ref={imageContainerRef}
            className="image-container"
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
          >
            <img 
              src={displayUrl} 
              alt="Loaded content" 
              onClick={handleImageClick}
              onLoad={handleImageLoad}
              style={{ 
                cursor: isDragging ? 'grabbing' : 'crosshair',
                width: imgDimensions.width ? `${imgDimensions.width * (zoom / 100)}px` : 'auto'
              }}
            />
            <svg 
              className="overlay"
              viewBox={imgDimensions.width ? `0 0 ${imgDimensions.width} ${imgDimensions.height}` : undefined}
            >
              {savedPolygons.map((polygon, index) => (
                <polygon
                  key={`saved-${index}`}
                  points={createPolygonPoints(polygon)}
                  fill="rgba(255, 255, 0, 0.2)"
                  stroke="yellow"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              
              {currentCoordinates.map((coord, index) => {
                if (index === currentCoordinates.length - 1) return null;
                const nextCoord = currentCoordinates[index + 1];
                return (
                  <line
                    key={`line-${index}`}
                    x1={coord.x}
                    y1={coord.y}
                    x2={nextCoord.x}
                    y2={nextCoord.y}
                    stroke="#00ff9d"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {currentCoordinates.length > 2 && (
                <polygon
                  points={createPolygonPoints(currentCoordinates)}
                  fill="rgba(0, 255, 157, 0.2)"
                  stroke="#00ff9d"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {currentCoordinates.map((coord, index) => (
                <g 
                  key={`marker-${index}`}
                  style={{ cursor: 'grab' }}
                >
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={8 / (zoom / 100)}
                    fill="transparent"
                    stroke="#00ff9d"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    onMouseDown={(e) => {
                      startDragging(index, e)
                    }}
                  />
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={4 / (zoom / 100)}
                    fill="red"
                    onMouseDown={(e) => {
                      startDragging(index, e)
                    }}
                  />
                </g>
              ))}
            </svg>
          </div>
        )}
        <pre className="coordinates-display">
          {formatCoordinatesArray()}
        </pre>
      </header>
    </div>
  );
}

export default App;
