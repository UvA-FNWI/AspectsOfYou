import React from 'react';

const ImageRow = () => {
  const imageStyle = {
    width: '200px',
    height: 'auto',
    objectFit: 'cover',
  };

  const containerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '80%',
    margin: '0 auto',
    marginTop: '60px',
    gap: '20px',
  };

  return (
    <div style={containerStyle}>
      <img
        src="/uvalogo.png"
        alt="First"
        style={imageStyle}
      />
      <img
        src="/Artboard4.png"
        alt="Second"
        style={imageStyle}
      />
    </div>
  );
};

export default ImageRow;
