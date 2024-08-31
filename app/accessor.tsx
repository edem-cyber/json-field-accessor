'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast, Toaster } from 'sonner';
import { List, Type, Hash, BarChart2 } from 'lucide-react';

const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'dart', label: 'Dart (Flutter)' },
];

const cleanJSON = (jsonString: string): string => {
    try {
        return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch (e) {
        return jsonString; // Return original string if parsing fails
    }
};

const detectJSONErrors = (jsonString: string): string[] => {
    const errors: string[] = [];

    // Check for unquoted keys
    const unquotedKeyRegex = /{\s*(\w+)\s*:/g;
    let match;
    while ((match = unquotedKeyRegex.exec(jsonString)) !== null) {
        errors.push(`Unquoted key: "${match[1]}"`);
    }

    // Check for missing commas
    const missingCommaRegex = /("[^"]*"\s*:\s*("[^"]*"|[\d.]+|true|false|null))\s+"/g;
    if (missingCommaRegex.test(jsonString)) {
        errors.push("Missing comma between properties");
    }

    // Check for trailing commas
    const trailingCommaRegex = /,\s*[}\]]/g;
    if (trailingCommaRegex.test(jsonString)) {
        errors.push("Trailing comma");
    }

    return errors;
};

const fixJSONErrors = (jsonString: string): string => {
    // Fix unquoted keys
    jsonString = jsonString.replace(/{\s*(\w+)\s*:/g, '{"$1":');

    // Fix missing commas
    jsonString = jsonString.replace(/("[^"]*"\s*:\s*("[^"]*"|[\d.]+|true|false|null))\s+"/g, '$1,');

    // Remove trailing commas
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    return jsonString;
};

interface Accessor {
    path: string;
    type: 'array' | 'object' | 'string' | 'number' | 'boolean' | 'null';
}

const generateAccessors = (obj: any, path = '', language: string): Accessor[] => {
    let result: Accessor[] = [];
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const newPath = path ? `${path}.${key}` : key;
            const prefix = language === 'dart' ? 'response.' : 'data.';
            const fullPath = `${prefix}${newPath}`;

            if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (Array.isArray(obj[key])) {
                    result.push({ path: fullPath, type: 'array' });
                    if (obj[key].length > 0) {
                        result = result.concat(generateAccessors(obj[key][0], `${newPath}[0]`, language));
                    }
                } else {
                    result.push({ path: fullPath, type: 'object' });
                    result = result.concat(generateAccessors(obj[key], newPath, language));
                }
            } else {
                result.push({ path: fullPath, type: typeof obj[key] as any });
            }
        }
    }
    return result;
};

const JSONFieldAccessor: React.FC = () => {
    const [jsonInput, setJsonInput] = useState<string>('');
    const [language, setLanguage] = useState<string>('javascript');
    const [accessors, setAccessors] = useState<Accessor[]>([]);
    const [hasErrors, setHasErrors] = useState<boolean>(false);

    useEffect(() => {
        if (jsonInput) {
            const errors = detectJSONErrors(jsonInput);
            setHasErrors(errors.length > 0);
            if (errors.length > 0) {
                toast.error(
                    <div>
                        <p>JSON errors detected:</p>
                        <ul>
                            {errors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleFixErrors()}
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Fix Errors
                        </button>
                    </div>,
                    {
                        duration: Infinity,
                    }
                );
            }
        }
    }, [jsonInput]);

    const handleJSONChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newInput = e.target.value;
        setJsonInput(newInput);
        updateAccessors(newInput);
    };

    const handleFixErrors = () => {
        const fixedJSON = fixJSONErrors(jsonInput);
        const beautifiedJSON = cleanJSON(fixedJSON);
        setJsonInput(beautifiedJSON);
        updateAccessors(beautifiedJSON);
        toast.success("JSON errors fixed and beautified");
    };

    const updateAccessors = (json: string) => {
        try {
            const parsed = JSON.parse(json);
            setAccessors(generateAccessors(parsed, '', language));
        } catch (e) {
            setAccessors([]);
        }
    };

    const handleLanguageChange = (value: string) => {
        setLanguage(value);
        updateAccessors(jsonInput);
        toast.success(`Switched to ${value === 'javascript' ? 'JavaScript' : 'Dart'} accessors`);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'array':
                return <List className="inline-block mr-2" size={18} />;
            case 'object':
                return <Hash className="inline-block mr-2" size={18} />;
            case 'string':
                return <Type className="inline-block mr-2" size={18} />;
            case 'number':
                return <BarChart2 className="inline-block mr-2" size={18} />;
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto p-4">
            <Toaster />
            <Card>
                <CardHeader>
                    <CardTitle>JSON Field Accessor</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Textarea
                            placeholder="Paste your JSON here"
                            value={jsonInput}
                            onChange={handleJSONChange}
                            rows={10}
                            className={hasErrors ? 'border-red-500' : ''}
                        />
                    </div>
                    <div className="mb-4">
                        <Select value={language} onValueChange={handleLanguageChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                            <SelectContent>
                                {languages.map((lang) => (
                                    <SelectItem key={lang.value} value={lang.value}>
                                        {lang.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Field Accessors:</h3>
                        <p className="mb-2">Total fields: {accessors.length}</p>
                        <ul className="list-none pl-0">
                            {accessors.map((accessor, index) => (
                                <li key={index} className="mb-1">
                                    {getIcon(accessor.type)}
                                    <span className="font-mono">{accessor.path}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default JSONFieldAccessor;