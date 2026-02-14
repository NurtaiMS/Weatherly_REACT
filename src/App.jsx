import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [city, setCity] = useState('Бишкек')
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [unit, setUnit] = useState('celsius')
  const [forecast, setForecast] = useState([])
  const [status, setStatus] = useState({ type: 'info', message: 'Введите название города (по умолчанию — Бишкек)' })
  const [autocompleteCities, setAutocompleteCities] = useState([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)

  // Функция для получения погоды по названию города
  const searchWeather = async (cityName) => {
    if (!cityName.trim()) return
    
    setLoading(true)
    setStatus({ type: 'info', message: 'Загрузка данных...' })
    
    try {
      // Получаем координаты города через геокодинг API
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=ru`
      )
      const geoData = await geoResponse.json()
      
      if (geoData.results && geoData.results.length > 0) {
        const { latitude, longitude, name, country } = geoData.results[0]
        
        // Получаем текущую погоду и прогноз
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m,pressure_msl&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`
        )
        const weatherData = await weatherResponse.json()
        
        // Преобразуем данные для отображения
        setWeatherData({
          temperature: weatherData.current_weather.temperature,
          description: getWeatherDescription(weatherData.current_weather.weathercode),
          city: name,
          country: country,
          feelsLike: weatherData.current_weather.temperature - 2, // Примерное значение
          humidity: weatherData.hourly.relativehumidity_2m[0],
          windSpeed: weatherData.current_weather.windspeed,
          pressure: weatherData.hourly.pressure_msl[0],
          weatherCode: weatherData.current_weather.weathercode
        })
        
        // Формируем прогноз на 7 дней
        const dailyForecast = weatherData.daily.time.map((date, index) => ({
          date: new Date(date),
          maxTemp: weatherData.daily.temperature_2m_max[index],
          minTemp: weatherData.daily.temperature_2m_min[index],
          weatherCode: weatherData.daily.weathercode[index],
          sunrise: weatherData.daily.sunrise[index],
          sunset: weatherData.daily.sunset[index]
        }))
        
        setForecast(dailyForecast)
        setStatus({ type: 'success', message: `Данные для ${name} успешно загружены` })
        setCity(name)
      } else {
        setStatus({ type: 'error', message: 'Город не найден' })
      }
    } catch (error) {
      console.error('Ошибка:', error)
      setStatus({ type: 'error', message: 'Ошибка при загрузке данных' })
    } finally {
      setLoading(false)
      setShowAutocomplete(false)
    }
  }

  // Функция для получения погоды по местоположению
  const getLocationWeather = () => {
    if (navigator.geolocation) {
      setLoading(true)
      setStatus({ type: 'info', message: 'Получение вашего местоположения...' })
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            
            // Получаем название города по координатам (обратное геокодирование)
            const geoResponse = await fetch(
              `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=ru`
            )
            const geoData = await geoResponse.json()
            
            if (geoData) {
              const cityName = geoData.city || geoData.name || 'Ваше местоположение'
              searchWeather(cityName)
            } else {
              setStatus({ type: 'error', message: 'Не удалось определить город' })
            }
          } catch (error) {
            console.error('Ошибка:', error)
            setStatus({ type: 'error', message: 'Ошибка при получении данных' })
          } finally {
            setLoading(false)
          }
        },
        (error) => {
          console.error('Ошибка геолокации:', error)
          setStatus({ type: 'error', message: 'Не удалось получить ваше местоположение' })
          setLoading(false)
        }
      )
    } else {
      setStatus({ type: 'error', message: 'Геолокация не поддерживается вашим браузером' })
    }
  }

  // Функция для автодополнения городов
  const searchCities = async (query) => {
    if (query.length < 2) {
      setAutocompleteCities([])
      return
    }

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ru`
      )
      const data = await response.json()
      
      if (data.results) {
        setAutocompleteCities(data.results)
        setShowAutocomplete(true)
      }
    } catch (error) {
      console.error('Ошибка при поиске городов:', error)
    }
  }

  // Функция для получения описания погоды по коду
  const getWeatherDescription = (code) => {
    const weatherCodes = {
      0: 'Ясно',
      1: 'Преимущественно ясно',
      2: 'Переменная облачность',
      3: 'Пасмурно',
      45: 'Туман',
      48: 'Изморозь',
      51: 'Легкая морось',
      53: 'Морось',
      55: 'Сильная морось',
      61: 'Небольшой дождь',
      63: 'Дождь',
      65: 'Сильный дождь',
      71: 'Небольшой снег',
      73: 'Снег',
      75: 'Сильный снег',
      77: 'Снежная крупа',
      80: 'Небольшие ливни',
      81: 'Ливни',
      82: 'Сильные ливни',
      95: 'Гроза',
      96: 'Гроза с градом',
      99: 'Сильная гроза с градом'
    }
    return weatherCodes[code] || 'Неизвестно'
  }

  // Функция для получения иконки погоды
  const getWeatherIcon = (code) => {
    if (code === 0) return 'fa-sun'
    if (code === 1 || code === 2) return 'fa-cloud-sun'
    if (code === 3) return 'fa-cloud'
    if (code >= 45 && code <= 48) return 'fa-smog'
    if (code >= 51 && code <= 67) return 'fa-cloud-rain'
    if (code >= 71 && code <= 77) return 'fa-snowflake'
    if (code >= 80 && code <= 82) return 'fa-cloud-showers-heavy'
    if (code >= 95) return 'fa-cloud-bolt'
    return 'fa-sun'
  }

  // Форматирование даты
  const formatDate = (date) => {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  // Форматирование дня недели
  const formatDayOfWeek = (date) => {
    return date.toLocaleDateString('ru-RU', { weekday: 'short' })
  }

  // Загрузка погоды при монтировании компонента
  useEffect(() => {
    searchWeather('Бишкек')
  }, [])

  // Конвертация температуры
  const convertTemp = (celsius) => {
    if (unit === 'fahrenheit') {
      return Math.round((celsius * 9/5) + 32)
    }
    return Math.round(celsius)
  }

  return (
    <>
      <div className="weather-app">
        {/* Основная панель */}
        <div className="main-panel">
          <div className="card">
            <div className="app-title">
              <h1>
                <i className="fa-solid fa-cloud-sun"></i>
                Weatherly
              </h1>
              <p className="app-subtitle">Современный прогноз погоды в реальном времени</p>
            </div>
            
            <div className="search-container">
              <div className="search-input-container">
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Введите город..."
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value)
                    searchCities(e.target.value)
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && searchWeather(city)}
                  onBlur={() => {
                    setTimeout(() => setShowAutocomplete(false), 200)
                  }}
                />
                {showAutocomplete && autocompleteCities.length > 0 && (
                  <div className="autocomplete-list" style={{ display: 'block' }}>
                    {autocompleteCities.map((city) => (
                      <div 
                        key={city.id}
                        className="autocomplete-item"
                        onClick={() => {
                          setCity(city.name)
                          searchWeather(city.name)
                        }}
                      >
                        <i className="fa-solid fa-map-pin"></i>
                        <div>
                          <div className="autocomplete-city">{city.name}</div>
                          <div className="autocomplete-region">{city.country}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => searchWeather(city)}
                disabled={loading}
              >
                {loading ? <span className="loading"></span> : <i className="fa-solid fa-search"></i>}
                <span>Поиск</span>
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={getLocationWeather}
                disabled={loading}
              >
                <i className="fa-solid fa-location-arrow"></i>
                <span>Моё местоположение</span>
              </button>
            </div>
            
            <div className="unit-toggle">
              <div 
                className={`unit-btn ${unit === 'celsius' ? 'active' : ''}`} 
                onClick={() => setUnit('celsius')}
              >
                °C
              </div>
              <div 
                className={`unit-btn ${unit === 'fahrenheit' ? 'active' : ''}`} 
                onClick={() => setUnit('fahrenheit')}
              >
                °F
              </div>
            </div>
            
            <div className={`status ${status.type}`}>
              <i className={`fa-solid fa-${status.type === 'error' ? 'exclamation-circle' : status.type === 'success' ? 'check-circle' : 'info-circle'}`}></i>
              <span>{status.message}</span>
            </div>
          </div>
          
          {/* Блок с текущей погодой */}
          <div className="card">
            <div className="current-weather">
              <div className="weather-icon">
                <i className={`fa-solid ${weatherData ? getWeatherIcon(weatherData.weatherCode) : 'fa-sun'}`}></i>
              </div>
              <div className="weather-info">
                <div className="temperature">
                  {weatherData ? `${convertTemp(weatherData.temperature)}°${unit === 'celsius' ? 'C' : 'F'}` : '--°C'}
                </div>
                <div className="weather-description">
                  {weatherData?.description || '--'}
                </div>
                <div className="weather-meta">
                  <div className="meta-item">
                    <i className="fa-solid fa-map-marker-alt"></i>
                    <span>{weatherData ? `${weatherData.city}, ${weatherData.country}` : city}</span>
                  </div>
                  <div className="meta-item">
                    <i className="fa-solid fa-clock"></i>
                    <span>{new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Горизонтальный прогноз на 7 дней */}
          <div className="card forecast-card">
            <div className="forecast-header">
              <h2>Прогноз на 7 дней</h2>
            </div>
            <div className="forecast-container" id="forecastContainer">
              {forecast.length > 0 ? forecast.map((day, index) => (
                <div key={index} className={`forecast-day ${index === 0 ? 'current' : ''}`}>
                  <div className="forecast-date">{formatDate(day.date)}</div>
                  <div className="forecast-day-name">{formatDayOfWeek(day.date)}</div>
                  <div className="forecast-icon">
                    <i className={`fa-solid ${getWeatherIcon(day.weatherCode)}`}></i>
                  </div>
                  <div className="forecast-temp">
                    <span className="temp-high">{convertTemp(day.maxTemp)}°</span>
                    <span className="temp-low">{convertTemp(day.minTemp)}°</span>
                  </div>
                  <div className="forecast-description">
                    {getWeatherDescription(day.weatherCode)}
                  </div>
                </div>
              )) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>
                  Загрузка прогноза...
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Боковая панель с деталями погоды */}
        <div className="side-panel">
          <div className="card">
            <h2>Детали погоды</h2>
            <div className="weather-details">
              <div className="detail-card">
                <div className="detail-label">
                  <i className="fa-solid fa-temperature-low"></i>
                  Ощущается как
                </div>
                <div className="detail-value">
                  {weatherData ? `${convertTemp(weatherData.feelsLike)}°${unit === 'celsius' ? 'C' : 'F'}` : '--°C'}
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-label">
                  <i className="fa-solid fa-tint"></i>
                  Влажность
                </div>
                <div className="detail-value">
                  {weatherData ? `${weatherData.humidity}%` : '--%'}
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-label">
                  <i className="fa-solid fa-wind"></i>
                  Ветер
                </div>
                <div className="detail-value">
                  {weatherData ? `${weatherData.windSpeed} м/с` : '-- м/с'}
                </div>
              </div>
              <div className="detail-card">
                <div className="detail-label">
                  <i className="fa-solid fa-tachometer-alt"></i>
                  Давление
                </div>
                <div className="detail-value">
                  {weatherData ? `${Math.round(weatherData.pressure)} hPa` : '-- hPa'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Футер с информацией об API */}
      <div className="api-footer">
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="api-info">
          <i className="fa-solid fa-code"></i>
          <span>Данные о погоде предоставлены Open-Meteo API</span>
          <i className="fa-solid fa-external-link-alt"></i>
        </a>
      </div>
    </>
  )
}

export default App