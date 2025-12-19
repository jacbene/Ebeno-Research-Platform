// src/modules/bibliography/parsers/bibtex.parser.ts
export class BibTeXParser {
    parse(content: string): any[] {
      const entries: any[] = [];
      const lines = content.split('\n');
      let currentEntry: any = null;
      let inEntry = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Détecter le début d'une entrée
        if (line.startsWith('@')) {
          if (currentEntry) entries.push(currentEntry);
          
          const match = line.match(/@(\w+)\{([^,]+),/);
          if (match) {
            currentEntry = {
              type: this.mapType(match[1]),
              citationKey: match[2],
              authors: [],
              tags: []
            };
            inEntry = true;
          }
        }
        // Détecter la fin d'une entrée
        else if (line === '}' && inEntry) {
          inEntry = false;
        }
        // Parser les champs
        else if (inEntry && line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim();
          
          if (key && value) {
            this.parseField(key.trim(), value, currentEntry);
          }
        }
      }
      
      if (currentEntry) entries.push(currentEntry);
      return entries;
    }
  
    private parseField(key: string, value: string, entry: any) {
      const cleanValue = value.replace(/[{}"]/g, '').trim();
      
      switch (key.toLowerCase()) {
        case 'author':
          entry.authors = this.parseAuthors(cleanValue);
          break;
        case 'title':
          entry.title = cleanValue;
          break;
        case 'year':
          entry.year = parseInt(cleanValue) || new Date().getFullYear();
          break;
        case 'journal':
          entry.journal = cleanValue;
          break;
        case 'booktitle':
          entry.journal = cleanValue;
          break;
        case 'volume':
          entry.volume = cleanValue;
          break;
        case 'number':
          entry.issue = cleanValue;
          break;
        case 'pages':
          entry.pages = cleanValue;
          break;
        case 'publisher':
          entry.publisher = cleanValue;
          break;
        case 'doi':
          entry.doi = cleanValue;
          break;
        case 'isbn':
          entry.isbn = cleanValue;
          break;
        case 'issn':
          entry.issn = cleanValue;
          break;
        case 'abstract':
          entry.abstract = cleanValue;
          break;
        case 'url':
          entry.url = cleanValue;
          break;
      }
    }
  
    private parseAuthors(authorString: string): string[] {
      return authorString.split(' and ').map(author => {
        const parts = author.trim().split(', ');
        if (parts.length === 2) {
          return `${parts[1]} ${parts[0]}`;
        }
        return author.trim();
      });
    }
  
    private mapType(bibtexType: string): string {
      const typeMap: Record<string, string> = {
        'article': 'ARTICLE',
        'book': 'BOOK',
        'inproceedings': 'CONFERENCE',
        'conference': 'CONFERENCE',
        'incollection': 'CHAPTER',
        'phdthesis': 'THESIS',
        'mastersthesis': 'THESIS',
        'techreport': 'REPORT',
        'online': 'WEBPAGE',
        'misc': 'OTHER'
      };
      
      return typeMap[bibtexType.toLowerCase()] || 'OTHER';
    }
  }
