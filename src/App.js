import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [imageUrl, setImageUrl] = useState('');
  const [displayUrl, setDisplayUrl] = useState('');
  const [currentCoordinates, setCurrentCoordinates] = useState([]);
  const [savedPolygons, setSavedPolygons] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const imageContainerRef = useRef(null);

  const handleLoadImage = () => {
    setDisplayUrl(imageUrl);
    setCurrentCoordinates([]);
    setSavedPolygons([]);
  };

  const handleImageClick = (e) => {
    // Only add new point if we're not dragging
    if (!isDragging) {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCurrentCoordinates([...currentCoordinates, { x: Math.round(x), y: Math.round(y) }]);
    }
  };

  const startDragging = useCallback((index, e) => {
    setIsDragging(true);
    setDragIndex(index);
    console.log('Start dragging point:', index);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && dragIndex !== null) {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
      
      setCurrentCoordinates(coords => {
        const newCoords = [...coords];
        newCoords[dragIndex] = { x: Math.round(x), y: Math.round(y) };
        return newCoords;
      });
    }
  }, [isDragging, dragIndex]);

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

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [currentCoordinates, savedPolygons]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopDragging);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDragging);
    };
  }, [handleMouseMove, stopDragging]);  return (
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
              style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
            />
            <svg className="overlay">
              {savedPolygons.map((polygon, index) => (
                <polygon
                  key={`saved-${index}`}
                  points={createPolygonPoints(polygon)}
                  fill="rgba(255, 255, 0, 0.2)"
                  stroke="yellow"
                  strokeWidth="2"
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
                  />
                );
              })}

              {currentCoordinates.length > 2 && (
                <polygon
                  points={createPolygonPoints(currentCoordinates)}
                  fill="rgba(0, 255, 157, 0.2)"
                  stroke="#00ff9d"
                  strokeWidth="2"
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
                    r="8"
                    fill="transparent"
                    stroke="#00ff9d"
                    strokeWidth="2"
                    onMouseDown={(e) => {
                        console.log('Mouse down on outer circle:', index)
                        startDragging(index, e)
                    }}
                  />
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="4"
                    fill="red"
                    onMouseDown={(e) => {
                        console.log('Mouse down on inner circle:', index)
                        startDragging(index, e)
                    }}
                  />
                </g>
              ))}            </svg>
          </div>
        )}
        <div className="coordinates-display">
          Active Points: {currentCoordinates.length} | Saved Polygons: {savedPolygons.length}
        </div>
        <div className="debug-info">
          <h3>Active Coordinates:</h3>
          {currentCoordinates.map((coord, index) => (
            <div key={index}>
              Point {index + 1}: x={coord.x}, y={coord.y}
            </div>
          ))}
          <h3>Saved Polygons:</h3>
          {savedPolygons.map((polygon, polyIndex) => (
            <div key={polyIndex}>
              Polygon {polyIndex + 1}:
              {polygon.map((coord, pointIndex) => (
                <div key={pointIndex} style={{marginLeft: '20px'}}>
                  Point {pointIndex + 1}: x={coord.x}, y={coord.y}
                </div>
              ))}
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}
export default App;