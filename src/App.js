import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const VERSION = '__VERSION__';

  const [imageUrl, setImageUrl] = useState('');
  const [displayUrl, setDisplayUrl] = useState('');
  const [currentCoordinates, setCurrentCoordinates] = useState([]);
  const [savedPolygons, setSavedPolygons] = useState([]);
  const [hoveredPolygonIndex, setHoveredPolygonIndex] = useState(null);
  const [draggedPolygonIndex, setDraggedPolygonIndex] = useState(null);
  const [dragOverPolygonIndex, setDragOverPolygonIndex] = useState(null);
  const [activePanelTab, setActivePanelTab] = useState('polygons');
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
    setHoveredPolygonIndex(null);
    setDraggedPolygonIndex(null);
    setDragOverPolygonIndex(null);
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
    const orderedSavedPolygons = savedPolygons.map(poly => poly.map(coord => [coord.x, coord.y]));
    const allPolygons = [...orderedSavedPolygons];
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

  const handleDeletePolygon = (polygonIndex) => {
    const shouldDelete = window.confirm(`Are you sure you want to delete polygon #${polygonIndex + 1}?`);
    if (!shouldDelete) {
      return;
    }

    setSavedPolygons(polygons => polygons.filter((_, index) => index !== polygonIndex));
    setHoveredPolygonIndex(currentHovered => {
      if (currentHovered === null) return null;
      if (currentHovered === polygonIndex) return null;
      if (currentHovered > polygonIndex) return currentHovered - 1;
      return currentHovered;
    });
  };

  const handlePolygonDragStart = (polygonIndex, e) => {
    setDraggedPolygonIndex(polygonIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(polygonIndex));
    e.dataTransfer.setData('application/x-tfeditor-polygon-index', String(polygonIndex));
  };

  const getDraggedPolygonIndex = (e) => {
    const customData = e.dataTransfer.getData('application/x-tfeditor-polygon-index');
    const fallbackData = e.dataTransfer.getData('text/plain');
    const parsedIndex = Number.parseInt(customData || fallbackData, 10);
    return Number.isNaN(parsedIndex) ? null : parsedIndex;
  };

  const handlePolygonDragOver = (polygonIndex, e) => {
    e.preventDefault();
    const sourceIndex = draggedPolygonIndex ?? getDraggedPolygonIndex(e);
    if (sourceIndex !== null && sourceIndex !== polygonIndex) {
      setDragOverPolygonIndex(polygonIndex);
    }
  };

  const handlePolygonDrop = (dropIndex, e) => {
    e.preventDefault();
    const sourceIndex = draggedPolygonIndex ?? getDraggedPolygonIndex(e);
    if (sourceIndex === null || sourceIndex === dropIndex) {
      setDraggedPolygonIndex(null);
      setDragOverPolygonIndex(null);
      return;
    }

    setSavedPolygons(polygons => {
      const reordered = [...polygons];
      const [movedPolygon] = reordered.splice(sourceIndex, 1);
      reordered.splice(dropIndex, 0, movedPolygon);
      return reordered;
    });
    setHoveredPolygonIndex(dropIndex);
    setDraggedPolygonIndex(null);
    setDragOverPolygonIndex(null);
  };

  const handlePolygonDragEnd = () => {
    setDraggedPolygonIndex(null);
    setDragOverPolygonIndex(null);
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
        <h1>TF Editor by BizzBuzzComics <span className="app-version">({VERSION})</span></h1>
        <div className="editor-layout">
          <section className="left-panel">
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
            <div className="canvas-stage">
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
                        fill={hoveredPolygonIndex === index ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 0, 0.2)'}
                        stroke={hoveredPolygonIndex === index ? '#ff3333' : 'yellow'}
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
                            startDragging(index, e);
                          }}
                        />
                        <circle
                          cx={coord.x}
                          cy={coord.y}
                          r={4 / (zoom / 100)}
                          fill="red"
                          onMouseDown={(e) => {
                            startDragging(index, e);
                          }}
                        />
                      </g>
                    ))}
                  </svg>
                </div>
              )}
            </div>
          </section>
          <aside className="right-panel">
            <div className="panel-tabs">
              <button
                type="button"
                className={activePanelTab === 'polygons' ? 'active-tab' : ''}
                onClick={() => setActivePanelTab('polygons')}
              >
                Polygons
              </button>
              <button
                type="button"
                className={activePanelTab === 'export' ? 'active-tab' : ''}
                onClick={() => setActivePanelTab('export')}
              >
                Export
              </button>
            </div>

            {activePanelTab === 'polygons' ? (
              <div className="polygon-list">
                <h3>Saved polygons</h3>
                {savedPolygons.length === 0 ? (
                  <p className="polygon-empty">No saved polygons yet.</p>
                ) : (
                  <ul>
                    {savedPolygons.map((_, index) => (
                      <li
                        key={`polygon-list-${index}`}
                        onMouseEnter={() => setHoveredPolygonIndex(index)}
                        onMouseLeave={() => setHoveredPolygonIndex(null)}
                        onDragOver={(e) => handlePolygonDragOver(index, e)}
                        onDrop={(e) => handlePolygonDrop(index, e)}
                        className={dragOverPolygonIndex === index ? 'polygon-drop-target' : ''}
                      >
                        <span>{`#${index + 1}`}</span>
                        <div className="polygon-actions">
                          <button
                            type="button"
                            className="move-polygon-button"
                            draggable
                            onDragStart={(e) => handlePolygonDragStart(index, e)}
                            onDragEnd={handlePolygonDragEnd}
                            aria-label={`Move polygon #${index + 1}`}
                            title="Drag to reorder"
                          >
                            ::
                          </button>
                          <button
                            type="button"
                            className="delete-polygon-button"
                            onClick={() => handleDeletePolygon(index)}
                            aria-label={`Delete polygon #${index + 1}`}
                          >
                            x
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <pre className="coordinates-display">
                {formatCoordinatesArray()}
              </pre>
            )}
          </aside>
        </div>
      </header>
    </div>
  );
}

export default App;
