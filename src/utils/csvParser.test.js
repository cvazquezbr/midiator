import { describe, it, expect, vi } from 'vitest';
import { parseCsv } from './csvParser';

// Mock PapaParse
vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn(),
  },
}));

// We need to import Papa after the mock is set up
import Papa from 'papaparse';

describe('parseCsv', () => {
  // Helper to create a mock File object
  const createMockFile = (content) => {
    const blob = new Blob([content], { type: 'text/csv' });
    return new File([blob], 'test.csv');
  };

  it('should reject if no file is provided', async () => {
    await expect(parseCsv(null)).rejects.toThrow('Nenhum arquivo fornecido para o parser.');
  });

  it('should parse a valid CSV file and resolve with data and headers', async () => {
    const csvContent = 'header1,header2\nvalue1,value2';
    const mockFile = createMockFile(csvContent);
    const expectedData = [{ header1: 'value1', header2: 'value2' }];
    const expectedHeaders = ['header1', 'header2'];

    // Configure the mock to call the 'complete' callback
    Papa.parse.mockImplementation((file, config) => {
      config.complete({ data: expectedData, errors: [], meta: { fields: expectedHeaders } });
    });

    const result = await parseCsv(mockFile);
    expect(result.data).toEqual(expectedData);
    expect(result.headers).toEqual(expectedHeaders);
  });

  it('should resolve with empty arrays for an empty CSV file', async () => {
    const mockFile = createMockFile(''); // Empty content

    Papa.parse.mockImplementation((file, config) => {
      config.complete({ data: [], errors: [], meta: { fields: [] } });
    });

    const result = await parseCsv(mockFile);
    expect(result.data).toEqual([]);
    expect(result.headers).toEqual([]);
  });

  it('should reject when Papa.parse encounters an error', async () => {
    const mockFile = createMockFile('some,content');
    const mockError = new Error('Test parsing error');

    // Configure the mock to call the 'error' callback
    Papa.parse.mockImplementation((file, config) => {
      config.error(mockError);
    });

    await expect(parseCsv(mockFile)).rejects.toThrow('Erro ao ler o arquivo CSV. Verifique se o formato está correto.');
  });
});
