/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */

import * as tfc from '@tensorflow/tfjs-core';
// NOTE: It is necessary to import `TensorContainer` from dist currently,
// because it is not exposed in the public API of tfjs-core.
import {TensorContainer} from '@tensorflow/tfjs-core/dist/tensor_types';
import {Shape} from '../types';

/**
 * Stub interfaces and classes for testing tf.Model.fitDataset().
 *
 * TODO(cais, soergel): Remove this in favor of actual interfaces and classes
 *   when ready.
 */

export abstract class LazyIterator<T> {
  abstract async next(): Promise<IteratorResult<T>>;
}

export abstract class Dataset<T extends TensorContainer> {
  abstract async iterator(): Promise<LazyIterator<T>>;
}

export interface FakeDatasetConfig {
  /**
   * The shape(s) of the features of a single example.
   *
   * Use an object mapping name to shape, if more than one feature tensors
   * are required.
   */
  xShape: Shape|{[name: string]: Shape};

  /**
   * The shape of the target(s) of a single exapmle.
   */
  yShape: Shape|{[name: string]: Shape};

  /**
   * The size of each batch generated by the iterator.
   */
  batchSize: number;

  /**
   * The number of batches an iterator generates before declaring done to be
   * true.
   */
  numBatches: number;
}

function mergeBatchSizeAndShape(
    batchSize: number, shape: Shape|{[name: string]: Shape}): Shape|
    {[name: string]: Shape} {
  if (Array.isArray(shape)) {
    return [batchSize].concat(shape);
  } else {
    const output: {[name: string]: Shape} = {};
    for (const name in shape) {
      output[name] = [batchSize].concat(shape[name]);
    }
    return output;
  }
}

function generateRandomTensorContainer(shape: Shape|{[name: string]: Shape}):
    tfc.Tensor|{[name: string]: tfc.Tensor} {
  let output: tfc.Tensor|{[name: string]: tfc.Tensor};
  if (Array.isArray(shape)) {
    output = tfc.randomNormal(shape);
  } else {
    output = {};
    for (const name in shape) {
      output[name] = tfc.randomNormal(shape[name]);
    }
  }
  return output;
}

export type TensorMap = {
  [name: string]: tfc.Tensor
};
export type TensorOrTensorMap = tfc.Tensor|TensorMap;

class FakeNumericIterator extends
    LazyIterator<[TensorOrTensorMap, TensorOrTensorMap]> {
  private xBatchShape: Shape|{[name: string]: Shape};
  private yBatchShape: Shape|{[name: string]: Shape};
  private numBatches: number;
  private batchCount: number;

  constructor(config: FakeDatasetConfig) {
    super();
    this.xBatchShape = mergeBatchSizeAndShape(config.batchSize, config.xShape);
    this.yBatchShape = mergeBatchSizeAndShape(config.batchSize, config.yShape);
    this.numBatches = config.numBatches;
    this.batchCount = 0;
  }

  async next():
      Promise<IteratorResult<[TensorOrTensorMap, TensorOrTensorMap]>> {
    const done = ++this.batchCount > this.numBatches;
    return {
      done,
      value: done ? null :
                    [
                      generateRandomTensorContainer(this.xBatchShape),
                      generateRandomTensorContainer(this.yBatchShape)
                    ]
    };
  }
}

/**
 * A fake dataset with configurable feature and target shapes.
 *
 * The batch size and # of batches are also configurable.
 *
 * The iterator from the dataset always generate random-normal float32 values.
 */
export class FakeNumericDataset extends
    Dataset<[TensorOrTensorMap, TensorOrTensorMap]> {
  constructor(readonly config: FakeDatasetConfig) {
    super();
    tfc.util.assert(
        config.batchSize > 0 && Number.isInteger(config.batchSize),
        `batchSize must be a positive integer, but got ${config.batchSize}`);
    tfc.util.assert(
        config.numBatches > 0 && Number.isInteger(config.numBatches),
        `numBatches must be positive integer, but got ${config.numBatches}`);
  }

  async iterator():
      Promise<LazyIterator<[TensorOrTensorMap, TensorOrTensorMap]>> {
    return new FakeNumericIterator(this.config);
  }
}