import { createTheme } from '@mui/material/styles';

const uvaTheme = createTheme({
palette: {
    primary: {
    main: '#bc0031',
    light: '#de8098',
    dark: "#840022",
    lighter: '#ebb3c1',
    lighterr: '#f5d9e0',
    lightest: '#faebef',
    contrastText: '#fffff',
    },
    secondary: {
    main: '#A8A29F',
    light: '#D7D6D4',
    contrastText: '#1B1918',
    lighter: '#E6E5E3',
    lightest: '#F5F5F3',
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f3',
    },
    text: {
      primary: '#1B1918',
      secondary: '#A8A29F',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

export default uvaTheme;
