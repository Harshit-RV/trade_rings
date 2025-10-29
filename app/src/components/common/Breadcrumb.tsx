import { useLocation } from "react-router";
import { Link } from "react-router";

const Breadcrumb = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    
    if (segments.length === 0) {
      return [{ label: 'Arenas', path: '/' }];
    }
    
    if (segments[0] === 'arena') {
      return [
        { label: 'Arenas', path: '/' }
      ];
    }
    
    if (segments[0] === 'trade' && segments[1]) {
      return [
        { label: 'Arenas', path: '/' },
        { label: `Trading on ${segments[1].slice(0, 8)}...`, path: `/trade/${segments[1]}` }
      ];
    }

    if (segments[0] === 'register' && segments[1]) {
      return [
        { label: 'Arenas', path: '/' },
        { label: `Register for ${segments[1].slice(0, 8)}...`, path: `/trade/${segments[1]}` }
      ];
    }
    
    if (segments[0] === 'docs') {
      return [
        { label: 'Docs', path: '/docs' }
      ];
    }
    
    return [{ label: 'Arenas', path: '/' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={index} className="flex items-center">
          
          {index > 0 && (
            <span className="text-gray-400 mx-2">{`>`}</span>
          )}

          <Link 
            to={breadcrumb.path}
            className="text-gray-300 hover:text-white transition-colors font-bold"
          >
            {breadcrumb.label}
          </Link>

        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;
