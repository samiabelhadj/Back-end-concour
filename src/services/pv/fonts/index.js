const path = require('path');

const fonts = {
  Roboto: {
    normal:      path.join(__dirname, 'Roboto-Regular.ttf'),
    bold:        path.join(__dirname, 'Roboto-Medium.ttf'),
    italics:     path.join(__dirname, 'Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, 'Roboto-MediumItalic.ttf'),
  },
  Amiri: {
    normal:      path.join(__dirname, 'Amiri-Regular.ttf'),
    bold:        path.join(__dirname, 'Amiri-Bold.ttf'),
    italics:     path.join(__dirname, 'Amiri-Regular.ttf'),
    bolditalics: path.join(__dirname, 'Amiri-Bold.ttf'),
  }
};

module.exports = fonts;