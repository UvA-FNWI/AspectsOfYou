'use client';

export default function DisplayPlaceholder({
  title = 'No content',
  message = '',
  icon = 'survey', // 'survey' | 'check' | 'close' | custom svg element
  className = '',
}) {
  const renderIcon = () => {
    switch (icon) {
      case 'check':
        return (
          <img src="/icons/check.svg" alt="" className="h-8 w-8 text-color-primary-dark" />
        );
      case 'close':
      default:
        return (
          <img src="/icons/x.svg" alt="" className="h-8 w-8 text-color-primary-dark" />
        );
    }
  };

  return (
    <div className={`background-color-primary-lighter border-color-primary-main border rounded-lg p-8 max-w-md w-full text-center shadow-lg ${className}`}>
      <div className="w-16 h-16 background-color-primary-main mx-auto rounded-full flex items-center justify-center mb-4">
        {renderIcon()}
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
      <p className="text-gray-600">{message}</p>
    </div>
  );
}
