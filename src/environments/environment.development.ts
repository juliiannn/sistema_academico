// Versión LOCAL (la usa `ng serve`): las dos APIs corriendo en tu computador.
//   api_principal:  uvicorn main:app --reload --port 8000
//   api_auxiliar:   npm run dev   (puerto 4000)
export const environment = {
  production: false,
  mainApiUrl: 'http://localhost:8000',
  auxApiUrl: 'http://localhost:4000',
  ollamaUrl: 'http://localhost:11434'
};
