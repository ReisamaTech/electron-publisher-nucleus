const { Publisher } = require("electron-publish/out/publisher");
const { httpExecutor } = require("builder-util/out/nodeHttpExecutor");
const mime = require("mime");
const { configureRequestOptions } = require("builder-util-runtime");
const { Arch } = require("builder-util");
const { createReadStream, stat } = require("fs-extra-p");
const { basename, join } = require("path");
const fetch = require('node-fetch');
const Progress = require('node-fetch-progress');
const FormData = require('form-data');


console.debug = function(...args) {
  const caller_line = (new Error).stack.split("\n")[2].split("/").pop().slice(0,-1);
  console.log(`\x1b[33m[DEBUG] \x1b[33m[${caller_line}]\x1b[0m`, ...args);
}

class NucleusPublisher extends Publisher {
    async upload(task) {
      //console.debug(task);
      const file = task.file;
      console.debug(file);
      console.debug(`This should be packager data:`);
      const packageJsonContent = require(join(
        this.context.packager.appDir,
        "package.json"
      ));
      const publishConfig = task.publishConfig || packageJsonContent["publisher"] || {};
      console.debug(publishConfig);
      const fileName =
        (this.useSafeArtifactName ? task.safeArtifactName : null) ||
        basename(task.file);
      console.debug(`File Name: ${fileName}`);
      // FIXME: better os detection
      let os;
      switch (task.packager.platform.name) {
        case "windows":
          os = "win32";
          break;
        default:
          os = task.packager.platform.name;
          break;
      }
      console.debug(`Operating System: ${os}`);
      console.debug(`File Content: ${task.fileContent}`);
      if (task.fileContent != null) {
        await this.doUpload(publishConfig,
          fileName,
          task.arch || Arch.x64,
          task.fileContent.length,
          it => it.end(task.fileContent),
          file,
          os
        );
        return;
      }
  
    const fileStat = await stat(task.file);
  
    //   const progressBar = this.createProgressBar(fileName, fileStat.size);
      await this.doUpload(publishConfig,
        fileName,
        task.arch || Arch.x64,
        fileStat.size,
        (request, reject) => {
          
        },
        task.file,
        os
      );
    }
  
    async doUpload(publishConfig, fileName, arch, dataLength, requestProcessor, file, os) {
      console.debug(`fileName : ${fileName}`);
      console.debug(`arch : ${arch}`);
      console.debug(`requestProcessor : ${requestProcessor}`);
      console.debug(`file : ${file}`);
      console.debug(`os : ${os}`);
      console.debug(`Attempting to fetch-upload...`);

      const packageJsonContent = require(join(
        this.context.packager.appDir,
        "package.json"
      ));
      const appInfo = this.context.packager.appInfo;
      const version = packageJsonContent["version"];
      const configuration = publishConfig || {};
      const hostname = configuration.hostname || "localhost";
      const protocol = configuration.protocol || "http";
      const port = configuration.port || (protocol === "https" ? 443 : 80);
      const method = configuration.method || "POST";
      const URL = configuration.url || null;
      const pathPattern = configuration.path || "rest/app/${appId}/channel/${channelId}/upload";
      const channelId = configuration.channelId || {};
      const token = configuration.token || {};
      const appId = configuration.appId || {};
      const archName = Arch[arch];
      const path = pathPattern
        .replace(/\$\{appId\}/g, appId)
        .replace(/\$\{channelId\}/g, channelId)
        .replace(/\$\{arch\}/g, archName);
        
      console.debug(`==== Begin Publisher URL Builder ====`);
      console.debug(`Protocol: ${protocol}`);
      console.debug(`Hostname: ${hostname}`);
      console.debug(`Port: ${port}`);
      console.debug(`Version: ${version}`);
      console.debug(URL ? `URL: ${URL}` : `URL: Not Found`);
      const urlBuilder = `${protocol}://${hostname}:${port}/`;
      if(urlBuilder===URL&&URL!==null){ 
        console.debug(`URL built matches URL from configuration. Preferring built URL.`);
      }else if(URL!==null){
        console.debug(`URL built does not match URL from configuration. Using provided URL from configuration instead.`)
      }else{
        console.debug(`Using built URL`);
      }
      const fetchURL = `${urlBuilder===URL ? urlBuilder : (URL !==null ? URL : urlBuilder)}${path}`;
      console.debug(`Fetch URL: ${fetchURL}`);
      const formData = new FormData();
      formData.append("platform", os);
      formData.append("arch", arch);
      formData.append("version",version);

      formData.append("file",file);
      const response = await fetch(fetchURL,
      {method: method,
        headers: {
          "Authorization": token
        },
      body: formData})
      const progress = new Progress(response, { throttle: 100 })
      progress.on('progress', (p) => {
        process.stdout.write(
          `${Math.floor(p.progress * 100)}% - ${p.doneh}/${p.totalh} - ${
            p.rateh
          } - ${p.etah}                       \r`
        )
      })
      const result = await response.text()
      //console.debug(`Upload Result: ${result}`);
      console.log("");
      console.debug(`Status: ${response.status}`);
      if(response.status!==200){
        console.debug(result);
      }
      // return await httpExecutor.doApiRequest(
      //   configureRequestOptions({
      //     hostname,
      //     protocol: `${protocol}:`,
      //     port,
      //     path,
      //     method,
      //     headers: {
      //       ...headers,
      //       "Content-Type": mime.getType(fileName) || "application/octet-stream",
      //       "Content-Length": dataLength,
      //       "Authorization": token
      //     },
      //     ...connectionOptions
      //   }),
      //   this.context.cancellationToken,
      //   requestProcessor
      // );
    }
  }
  
  module.exports = {
    Nucleus: NucleusPublisher
  };