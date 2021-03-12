const { HttpPublisher } = require("electron-publish/out/publisher");
const { httpExecutor } = require("builder-util/out/nodeHttpExecutor");
const mime = require("mime");
const { configureRequestOptions } = require("builder-util-runtime");
const { Arch } = require("builder-util");
const { createReadStream, stat } = require("fs-extra-p");
const { basename, join } = require("path");

console.prototype.debug = function(...args) {
    if(process.env.DEBUG) console.log(`\x1b[33m[DEBUG] \x1b[0m`, ...args);
}

class Publisher extends HttpPublisher {
    async upload(task) {
      const fileName =
        (this.useSafeArtifactName ? task.safeArtifactName : null) ||
        basename(task.file);
  
      // FIXME: better os detection
      let os;
      switch (task.packager.platform.name) {
        case "windows":
          os = "win";
          break;
        default:
          os = task.packager.platform.name;
          break;
      }
  
      if (task.fileContent != null) {
        await this.doUpload(
          fileName,
          task.arch || Arch.x64,
          task.fileContent.length,
          it => it.end(task.fileContent),
          fileName,
          os
        );
        return;
      }
  
      const fileStat = await stat(task.file);
  
      const progressBar = this.createProgressBar(fileName, fileStat.size);
      await this.doUpload(
        fileName,
        task.arch || Arch.x64,
        fileStat.size,
        (request, reject) => {
          if (progressBar != null) {
            // reset (because can be called several times (several attempts)
            progressBar.update(0);
          }
          return this.createReadStreamAndProgressBar(
            task.file,
            fileStat,
            progressBar,
            reject
          ).pipe(request);
        },
        task.file,
        os
      );
    }
  
    async doUpload(fileName, arch, dataLength, requestProcessor, file, os) {
      const packageJsonContent = require(join(
        this.context.packager.appDir,
        "package.json"
      ));
      const appInfo = this.context.packager.appInfo;
      const configuration = packageJsonContent["build-simple-http"] || {};
      const hostname = configuration.hostname || "localhost";
      const protocol = configuration.protocol || "http";
      const port = configuration.port || (protocol === "https" ? 443 : 80);
      const method = configuration.method || "POST";
      const pathPattern = configuration.path || "rest/app/${appId}/channel/${channelId}/${arch}/upload";
      const channelId = configuration.channelId || {};
      const token = configuration.token || {};
      const appId = configuration.appId || {};
      const archName = Arch[arch];
      const path = pathPattern
        .replace(/\$\{appId\}/g, appId)
        .replace(/\$\{channelId\}/g, channelId)
        .replace(/\$\{arch\}/g, archName);
  
      return await httpExecutor.doApiRequest(
        configureRequestOptions({
          hostname,
          protocol: `${protocol}:`,
          port,
          path,
          method,
          headers: {
            ...headers,
            "Content-Type": mime.getType(fileName) || "application/octet-stream",
            "Content-Length": dataLength,
            "Authorization": token
          },
          ...connectionOptions
        }),
        this.context.cancellationToken,
        requestProcessor
      );
    }
  }
  
  module.exports = {
    default: Publisher
  };