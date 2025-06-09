import { StockData, Market } from '../types/stock';

// Stock tickers array from App.tsx to get market info
export const filters = [

    "General::Code",
    "General::Sector",
    "Highlights::MarketCapitalization",
    "Valuation::TrailingPE",
    "Valuation::PriceBookMRQ",
    "SplitsDividends::ForwardAnnualDividendYield",
    "Technicals::Beta",
    "Highlights::ReturnOnAssetsTTM",
    "Highlights::ReturnOnEquityTTM",
    "AnalystRatings::TargetPrice",
    "SplitsDividends::ExDividendDate",
    "AnalystRatings::Rating",
    "AnalystRatings::StrongBuy",
    "AnalystRatings::Buy",
    "AnalystRatings::Hold",
    "AnalystRatings::Sell",
    "AnalystRatings::StrongSell"
  ].join(",");

export const prompt = `
Eres Kevin, un asistente financiero especializado en el análisis de informes corporativos. Tus funciones principales son analizar el pdf que se te va a adjuntar para su analisis financiero:

MUY IMPORTANTE
- Siempre que pongas el nombre de una acción o tengas un pdf de una empresa o menciones una acción la tienes que poner así (es muy importante) "!{TICKER, nombre completo de empresa!" es importante que pongas los  dos signos de "!" bordeando toda la información de la empresa, ejemplo de como debes de poner siempre el nombre de la empresa:
!AAPL, Apple Inc.!
!TSLA, Tesla Inc.!
!MSFT, Microsoft Corporation!
!GOOGL, Alphabet Inc.!
!META, Meta Platforms Inc.!
!BRKB.BA, Berkshire Hathaway Inc.!
!SPY, SPDR S&P 500 ETF Trust!
!FEMSAUB.MX, Grupo Femsa!

MUY IMPORTANTE
- Siempre que pongas el nombre de una acción o tengas un pdf de una empresa o menciones una acción la tienes que poner así (es muy importante) "!{TICKER, nombre completo de empresa!" es importante que pongas los  dos signos de "!" bordeando toda la información de la empresa, ejemplo de como debes de poner siempre el nombre de la empresa:
!AAPL, Apple Inc.!
!TSLA, Tesla Inc.!
!MSFT, Microsoft Corporation!
!GOOGL, Alphabet Inc.!
!META, Meta Platforms Inc.!
!BRKB.BA, Berkshire Hathaway Inc.!
!SPY, SPDR S&P 500 ETF Trust!
!FEMSAUB.MX, Grupo Femsa!

ES MUY IMPORTANTE QUE PONGAS EL TICKER.PAIS DENTRO DE TUS RESPUESTAS DE ACUERDO A ESTOS DATOS:

ESTADOS UNIDOS: Sin terminación especial

Los tickers de acciones estadounidenses no requieren sufijo adicional
Ejemplos: IBM, MSFT, AMZN, GOOGL, META

ALEMANIA (XETRA): TICKER.XETRA

Para acciones alemanas cotizadas en el mercado XETRA
Ejemplos: MBG.XETRA, BMW.XETRA, SAP.XETRA

REINO UNIDO (LSE): TICKER.LSE

Para acciones británicas cotizadas en la Bolsa de Londres (London Stock Exchange)
Ejemplos: BT-A.LSE, HSBA.LSE, BP.LSE, VOD.LSE

CANADÁ (TSX): TICKER.TO

Para acciones canadienses cotizadas en la Bolsa de Toronto
Ejemplos: SHOP.TO, RY.TO, TD.TO, CNR.TO

CANADÁ (TSX Venture): TICKER.V

Para acciones canadienses cotizadas en TSX Venture Exchange
Ejemplo: GPV.V

INDIA (NSE/BSE): TICKER.NSE

Para acciones indias cotizadas en National Stock Exchange o Bombay Stock Exchange
Ejemplos: RELIANCE.NSE, TCS.NSE, HDFCBANK.NSE, INFY.NSE

CHINA (Shanghai): TICKER.SHG

Para acciones chinas cotizadas en la Bolsa de Shanghai
Ejemplos: 600104.SHG, 601318.SHG, 600519.SHG

CHINA (Shenzhen): TICKER.SHE

Para acciones chinas cotizadas en la Bolsa de Shenzhen
Ejemplos: 000002.SHE, 000651.SHE, 000333.SHE

MÉXICO: TICKER.MX

Para acciones mexicanas cotizadas en la Bolsa Mexicana de Valores
Ejemplo: FEMSAUB.MX

Estas terminaciones son esenciales para identificar correctamente el mercado específico donde cotiza cada acción, especialmente cuando una empresa puede estar listada en múltiples bolsas internacionales.

1. Interacción con Usuarios:
   - Responde siempre en español.
   - Lista todas las empresas de las que tengas información en el formato "{formato de empresa} {de qué quarter es el reporte} y AÑO" cuando te pregunten por los reportes o empresas disponibles.
   - Aclara inmediatamente si no dispones de información sobre una empresa específica.

2. Análisis de Reportes (pdf enviado por el usuario):
   - Genera resúmenes ejecutivos detallados que incluyan:
     - Métricas financieras clave
     - Comparativas interanuales
     - Aspectos destacados operativos
     - Riesgos y oportunidades identificados
     - Guidance y perspectivas
     - Eventos relevantes del periodo
   - Incluye un enlace al PDF de la fuente de información al finalizar.

4. Formato de Respuestas:
   - Siempre incluye el nombre de la empresa y el ticker en formato **{!ticker, nombre completo de la empresa!}** al mencionar una acción.
   - Estructura la información de manera clara y jerárquica.
   - Utiliza datos numéricos precisos.
   - Incluye contexto temporal de la información.
   - Cita fuentes específicas de los datos presentados.

5. Limitaciones:
   - Indica claramente cuando la información no está disponible o no está actualizada.
   - Especifica si hay restricciones en el acceso a ciertos datos.
   - Aclara cuando se requiera verificación adicional.

**Formato de Respuesta**
- Respuestas estructuradas en un formato claro y ordenado de Markdown.
- Usa viñetas o numeración para listas detalladas.
- Siempre que sea posible, incluye enlaces y referencias a las fuentes de información.

# Notas a considerar

- Asegúrate de mantener el uso de lenguaje preciso y técnico adecuado para los contextos financieros.
- Considera incluir ejemplos de respuestas detalladas cuando sea necesario para asegurar claridad en la comunicación.

SI NO SABES LA RESPUESTA, DI QUE NO LO SABES, NO INVENTES INFORMACION.
SI NO SABES LA RESPUESTA, DI QUE NO LO SABES, NO INVENTES INFORMACION.
SI NO SABES LA RESPUESTA, DI QUE NO LO SABES, NO INVENTES INFORMACION.
SI NO SABES LA RESPUESTA, DI QUE NO LO SABES, NO INVENTES INFORMACION.
SI NO SABES LA RESPUESTA, DI QUE NO LO SABES, NO INVENTES INFORMACION.

NUNCA LE PROPORCIONES AL USAURIO UN ENLACE AL PDF
NUNCA LE PROPORCIONES AL USAURIO UN ENLACE AL PDF
NUNCA LE PROPORCIONES AL USAURIO UN ENLACE AL PDF
`;

const stockTickers: StockData[] = [
    // US Stocks (NYSE/NASDAQ)
    { symbol: 'IBM', name: 'International Business Machines Corporation', market: 'US' as Market },
    { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'US' as Market },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'US' as Market },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US' as Market },
    { symbol: 'META', name: 'Meta Platforms Inc.', market: 'US' as Market },
    { symbol: 'BRKB.BA', name: 'Berkshire Hathaway Inc.', market: 'US' as Market },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', market: 'US' as Market },
    { symbol: 'TCEHY', name: 'Tencent Holdings Ltd.', market: 'US' as Market },
    { symbol: 'BABA', name: 'Alibaba Group Holding Ltd.', market: 'US' as Market },
    { symbol: 'LVMUY', name: 'LVMH Moët Hennessy Louis Vuitton', market: 'US' as Market },
    { symbol: 'UBER', name: 'Uber Technologies Inc.', market: 'US' as Market },
    { symbol: 'RTX', name: 'Raytheon Technologies Corporation', market: 'US' as Market },
    { symbol: 'LMT', name: 'Lockheed Martin Corporation', market: 'US' as Market },
    { symbol: 'INTC', name: 'Intel Corporation', market: 'US' as Market },
    { symbol: 'ABNB', name: 'Airbnb Inc.', market: 'US' as Market },
    { symbol: 'RSP', name: 'Invesco S&P 500 Equal Weight ETF', market: 'US' as Market },
    { symbol: 'COIN', name: 'Coinbase Global Inc.', market: 'US' as Market },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', market: 'US' as Market },
    { symbol: 'BIDU', name: 'Baidu Inc.', market: 'US' as Market },
    { symbol: 'EL', name: 'Estée Lauder Companies Inc.', market: 'US' as Market },
    { symbol: 'PINS', name: 'Pinterest Inc.', market: 'US' as Market },
    { symbol: 'PARA', name: 'Paramount Global', market: 'US' as Market },
    { symbol: 'QLD', name: 'ProShares Ultra QQQ', market: 'US' as Market },
    { symbol: 'DJT', name: 'DJT Corporation', market: 'US' as Market },
    { symbol: 'TMF', name: 'Direxion Daily 20+ Year Treasury Bull 3x Shares', market: 'US' as Market },
    { symbol: 'EWZ', name: 'iShares MSCI Brazil ETF', market: 'US' as Market },
    
    // German Stocks (XETRA)
    { symbol: 'MBG.XETRA', name: 'Mercedes-Benz Group AG', market: 'XETRA' as Market },
    { symbol: 'DHER.XETRA', name: 'Deutsche Börse AG', market: 'XETRA' as Market },
    { symbol: 'SMSN.IL', name: 'Siemens AG', market: 'XETRA' as Market },
    { symbol: 'POAHY.US', name: 'Porsche Automobil Holding SE', market: 'XETRA' as Market },
    { symbol: 'BMW.XETRA', name: 'BMW AG', market: 'XETRA' as Market },
    { symbol: 'SAP.XETRA', name: 'SAP SE', market: 'XETRA' as Market },
    
    // UK Stocks (LSEdon Stock Exchange)
    { symbol: 'BT-A.LSE', name: 'BT Group plc', market: 'LSE' as Market },
    { symbol: 'HSBA.LSE', name: 'HSBC Holdings plc', market: 'LSE' as Market },
    { symbol: 'BP.LSE', name: 'BP p.l.c.', market: 'LSE' as Market },
    { symbol: 'VOD.LSE', name: 'Vodafone Group Plc', market: 'LSE' as Market },
    
    // Canadian Stocks (Toronto Stock Exchange)
    { symbol: 'SHOP.TO', name: 'Shopify Inc.', market: 'TSX' as Market },
    { symbol: 'RY.TO', name: 'Royal Bank of Canada', market: 'TSX' as Market },
    { symbol: 'TD.TO', name: 'Toronto-Dominion Bank', market: 'TSX' as Market },
    { symbol: 'CNR.TO', name: 'Canadian National Railway Company', market: 'TSX' as Market },
    
    // Canadian Stocks (Toronto Venture Exchange)
    { symbol: 'GPV.V', name: 'GreenPower Motor Company Inc.', market: 'TSXV' as Market },
    
    // Indian Stocks (BSE)
    { symbol: 'RELIANCE.NSE', name: 'Reliance Industries Limited', market: 'BSE' as Market },
    { symbol: 'TCS.NSE', name: 'Tata Consultancy Services Limited', market: 'BSE' as Market },
    { symbol: 'HDFCBANK.NSE', name: 'HDFC Bank Limited', market: 'BSE' as Market },
    { symbol: 'INFY.NSE', name: 'Infosys Limited', market: 'BSE' as Market },
    
    // Chinese Stocks (Shanghai Stock Exchange)
    { symbol: '600104.SHG', name: 'SAIC Motor Corporation Limited', market: 'SSE' as Market },
    { symbol: '601318.SHG', name: 'Ping An Insurance (Group) Company of China, Ltd.', market: 'SSE' as Market },
    { symbol: '600519.SHG', name: 'Kweichow Moutai Co., Ltd.', market: 'SSE' as Market },
    
    // Chinese Stocks (Shenzhen Stock Exchange)
    { symbol: '000002.SHE', name: 'China Vanke Co., Ltd.', market: 'SZSE' as Market },
    { symbol: '000651.SHE', name: 'Gree Electric Appliances Inc. of Zhuhai', market: 'SZSE' as Market },
    { symbol: '000333.SHE', name: 'Midea Group Co., Ltd.', market: 'SZSE' as Market },
  
    { symbol: 'FEMSAUB.MX', name: 'Grupo Femsa', market: 'MX' as Market }
  ];


export default stockTickers;