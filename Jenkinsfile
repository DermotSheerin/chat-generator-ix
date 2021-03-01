pipeline {
    agent { dockerfile true }
    stages {
        stage('Test') {
            steps {
				sh 'docker ps -a'
				sh 'chmod 777 deploy.sh'
				sh 'docker kill chatgenerator > /dev/null 2>&1'
                sh 'docker rm chatgenerator > /dev/null 2>&1'
                sh 'docker-compose up -d'
            }
        }
    }
}