import { createClient } from '@supabase/supabase-js';

// Inicializar el cliente de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface MarketReport {
  id: string;
  title: string;
  description: string;
  stock_symbol: string;
  report_type: string;
  file_url: string;
  created_at: string;
}

// Función para extraer el símbolo de la acción del nombre del archivo
const extractStockSymbol = (fileName: string): string => {
  const match = fileName.match(/\(([A-Z]+)\)/);
  return match ? match[1] : 'UNKNOWN';
};

// Función para determinar el tipo de reporte basado en el nombre del archivo
const determineReportType = (fileName: string): string => {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.includes('quarterly') || lowerFileName.includes('q1') || lowerFileName.includes('q2') || lowerFileName.includes('q3') || lowerFileName.includes('q4')) {
    return 'quarterly';
  }
  if (lowerFileName.includes('annual') || lowerFileName.includes('year')) {
    return 'annual';
  }
  if (lowerFileName.includes('analysis') || lowerFileName.includes('review')) {
    return 'analysis';
  }
  return 'research';
};

// Función para procesar todos los archivos del bucket
export const processAllFiles = async () => {
  try {
    // 1. Obtener lista de archivos del bucket
    const { data: files, error: listError } = await supabase.storage
      .from('marketreports')
      .list();

    if (listError) throw listError;

    // 2. Procesar cada archivo
    for (const file of files) {
      // Obtener la URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('marketreports')
        .getPublicUrl(file.name);

      // Extraer información del nombre del archivo
      const stockSymbol = extractStockSymbol(file.name);
      const reportType = determineReportType(file.name);
      
      // Crear el título y descripción basados en el nombre del archivo
      const title = file.name.replace(/\.[^/.]+$/, ""); // Remover extensión
      const description = `Report for ${stockSymbol} - ${reportType} analysis`;

      // 3. Insertar en la base de datos
      const { error: insertError } = await supabase
        .from('market_reports')
        .insert([
          {
            title,
            description,
            stock_symbol: stockSymbol,
            report_type: reportType,
            file_url: publicUrl
          }
        ]);

      if (insertError) {
        console.error(`Error inserting file ${file.name}:`, insertError);
      }
    }

    return { success: true, message: `Processed ${files.length} files` };
  } catch (error) {
    console.error('Error processing files:', error);
    throw error;
  }
};

export const searchReports = async (query: string) => {
  try {
    let queryBuilder = supabase
      .from('market_reports')
      .select('*');

    if (query.trim()) {
      // Si hay búsqueda, aplicar filtros y ordenar por fecha
      queryBuilder = queryBuilder
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,stock_symbol.ilike.%${query}%`)
        .order('created_at', { ascending: false });
    } else {
      // Si no hay búsqueda, obtener todos los registros ordenados por fecha
      queryBuilder = queryBuilder
        .order('created_at', { ascending: false });
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return data as MarketReport[];
  } catch (error) {
    console.error('Error searching reports:', error);
    throw error;
  }
};

export const uploadReport = async (file: File, reportData: Omit<MarketReport, 'id' | 'created_at' | 'file_url'>) => {
  try {
    // 1. Subir el archivo a Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `reports/${fileName}`;

    const { data: fileData, error: uploadError } = await supabase.storage
      .from('marketreports')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Obtener la URL pública del archivo
    const { data: { publicUrl } } = supabase.storage
      .from('marketreports')
      .getPublicUrl(filePath);

    // 3. Crear el registro en la base de datos
    const { data, error } = await supabase
      .from('market_reports')
      .insert([
        {
          ...reportData,
          file_url: publicUrl
        }
      ])
      .select();

    if (error) throw error;
    return data[0] as MarketReport;
  } catch (error) {
    console.error('Error uploading report:', error);
    throw error;
  }
}; 