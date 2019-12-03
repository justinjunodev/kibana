/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { FieldFormatRegisty, Plugin, FieldFormatsStart, FieldFormatsSetup } from '.';
import { searchSetupMock } from './search/mocks';
import { queryServiceMock } from './query/mocks';
import { indexPatternsServiceMock } from './index_patterns/index_patterns_service.mock';

export type Setup = jest.Mocked<ReturnType<Plugin['setup']>>;
export type Start = jest.Mocked<ReturnType<Plugin['start']>>;

const autocompleteMock: any = {
  addProvider: jest.fn(),
  getProvider: jest.fn(),
  clearProviders: jest.fn(),
};

const fieldFormatsMock: PublicMethodsOf<FieldFormatRegisty> = {
  getByFieldType: jest.fn(),
  getConfig: jest.fn(),
  getDefaultConfig: jest.fn(),
  getDefaultInstance: jest.fn() as any,
  getDefaultInstanceCacheResolver: jest.fn(),
  getDefaultInstancePlain: jest.fn(),
  getDefaultType: jest.fn(),
  getDefaultTypeName: jest.fn(),
  getInstance: jest.fn() as any,
  getType: jest.fn(),
  getTypeNameByEsTypes: jest.fn(),
  init: jest.fn(),
  register: jest.fn(),
  parseDefaultTypeMap: jest.fn(),
};

const createSetupContract = (): Setup => {
  const querySetupMock = queryServiceMock.createSetupContract();
  const setupContract = {
    autocomplete: autocompleteMock,
    search: searchSetupMock,
    fieldFormats: fieldFormatsMock as FieldFormatsSetup,
    query: querySetupMock,
    indexPatterns: indexPatternsServiceMock.createSetupContract(),
  };

  return setupContract;
};

const createStartContract = (): Start => {
  const queryStartMock = queryServiceMock.createStartContract();
  const startContract = {
    autocomplete: autocompleteMock,
    getSuggestions: jest.fn(),
    search: { search: jest.fn() },
    fieldFormats: fieldFormatsMock as FieldFormatsStart,
    query: queryStartMock,
    ui: {
      IndexPatternSelect: jest.fn(),
    },
    indexPatterns: indexPatternsServiceMock.createStartContract(),
  };
  return startContract;
};

export const dataPluginMock = {
  createSetupContract,
  createStartContract,
};