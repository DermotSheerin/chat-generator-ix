pipeline {
    agent { dockerfile true }
    stages {
        stage('Test') {
            steps {
				docker.build(chatgenerator)
				sh 'chmod 777 deploy.sh'
            }
        }
    }
}