import { Result } from 'sass';

import { getIncludePaths } from '../utils';
import { Transformer, Processed, Options } from '../types';
import { importAny } from '../modules/importAny';

let sass: Options.Sass['implementation'];

type ResolveResult = {
  code: string;
  map: string | undefined;
  dependencies: string[];
};

function getResultForResolve(result: Result): ResolveResult {
  return {
    code: result.css.toString(),
    map: result.map?.toString(),
    dependencies: result.stats.includedFiles,
  };
}

const transformer: Transformer<Options.Sass> = async ({
  content,
  filename,
  options = {},
}) => {
  let implementation = options?.implementation ?? sass;

  if (implementation == null) {
    const mod = await importAny('node-sass', 'sass');
    implementation = sass = mod.default;
  }

  const { renderSync, ...sassOptions }: Options.Sass = {
    sourceMap: true,
    ...options,
    includePaths: getIncludePaths(filename, options.includePaths),
    outFile: `${filename}.css`,
  };

  sassOptions.data = options.data ? options.data + content : content;

  // scss errors if passed an empty string
  if (sassOptions.data.length === 0) {
    return { code: options.data };
  }

  if (renderSync) {
    return getResultForResolve(implementation.renderSync(sassOptions));
  }

  return new Promise<Processed>((resolve, reject) => {
    implementation.render(sassOptions, (err, result) => {
      if (err) return reject(err);

      resolve(getResultForResolve(result));
    });
  });
};

export default transformer;
