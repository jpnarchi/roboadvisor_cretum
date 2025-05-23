import { createClient } from '@supabase/supabase-js';

// Inicializar el cliente de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

export const searchReports = async (type: 'quarter' | 'research' = 'quarter') => {
  try {
    console.log('Searching reports of type:', type);
    
    // Determinar la tabla y el bucket según el tipo
    const table = type === 'quarter' ? 'market_reports' : 'research_reports';
    const bucket = 'research'; // Siempre usar el bucket 'research'

    console.log('Using table:', table, 'and bucket:', bucket);

    // Obtener los reportes de la tabla
    const { data: reports, error: tableError } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (tableError) {
      console.error('Error fetching from table:', tableError);
      if (tableError.code === '42501' || tableError.code === '403') {
        console.error('Permission denied. Please check table policies in Supabase.');
        return [];
      }
      throw tableError;
    }

    console.log('Reports from table:', reports);

    // Si no hay reportes en la tabla, intentar obtenerlos del bucket
    if (!reports || reports.length === 0) {
      console.log('No reports in table, checking bucket:', bucket);
      
      // Listar archivos del bucket
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list();

      if (listError) {
        console.error('Error listing files:', listError);
        if (listError.message?.includes('403') || listError.message?.includes('permission denied')) {
          console.error('Permission denied. Please check bucket policies in Supabase.');
          return [];
        }
        throw listError;
      }

      console.log('Files found in bucket:', files);

      if (!files || files.length === 0) {
        console.log('No files found in bucket');
        return [];
      }

      // Procesar los archivos del bucket
      const processedReports = await Promise.all(
        files.map(async (file) => {
          try {
            if (file.name === '.emptyFolderPlaceholder') {
              console.log('Skipping empty folder placeholder');
              return null;
            }

            console.log('Processing file:', file.name);
            
            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
              .from(bucket)
              .getPublicUrl(file.name);

            console.log('Public URL:', publicUrl);

            // Para reportes de investigación, usar el nombre del archivo como símbolo
            const stockSymbol = file.name.replace(/\.[^/.]+$/, "");
            const reportType = 'research';
            const title = file.name.replace(/\.[^/.]+$/, "");
            const description = `Research Report for ${title}`;

            console.log('Creating report with data:', {
              title,
              description,
              stock_symbol: stockSymbol,
              report_type: reportType,
              file_url: publicUrl
            });

            // Insertar en la tabla correspondiente
            const { data: insertedReport, error: insertError } = await supabase
              .from(table)
              .insert([
                {
                  title,
                  description,
                  stock_symbol: stockSymbol,
                  report_type: reportType,
                  file_url: publicUrl
                }
              ])
              .select()
              .single();

            if (insertError) {
              console.error(`Error inserting file ${file.name}:`, insertError);
              if (insertError.code === '42501' || insertError.code === '403') {
                console.error('Permission denied. Please check table policies in Supabase.');
              }
              return null;
            }

            console.log('Successfully inserted report:', insertedReport);
            return insertedReport;
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            return null;
          }
        })
      );

      const validReports = processedReports.filter(report => report !== null);
      console.log('Final processed reports:', validReports);
      return validReports;
    }

    return reports;
  } catch (error) {
    console.error('Error searching reports:', error);
    throw error;
  }
};

export const uploadReport = async (file: File, reportData: Omit<MarketReport, 'id' | 'created_at' | 'file_url'>, type: 'quarter' | 'research' = 'quarter') => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `reports/${fileName}`;
    const bucket = 'research'; // Siempre usar el bucket 'research'
    const table = type === 'quarter' ? 'market_reports' : 'research_reports';

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      if (uploadError.message?.includes('403') || uploadError.message?.includes('permission denied')) {
        console.error('Permission denied. Please check bucket policies in Supabase.');
        return null;
      }
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from(table)
      .insert([
        {
          ...reportData,
          file_url: publicUrl
        }
      ])
      .select();

    if (error) {
      console.error('Error inserting report:', error);
      if (error.code === '42501' || error.code === '403') {
        console.error('Permission denied. Please check table policies in Supabase.');
      }
      throw error;
    }
    return data[0] as MarketReport;
  } catch (error) {
    console.error('Error uploading report:', error);
    throw error;
  }
}; 