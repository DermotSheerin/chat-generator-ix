pipeline {
    agent {
        docker { image 'node:14-alpine'
				 sudo apt-get update -y
		}
    }
    stages {
        stage('Test') {
            steps {
                sh 'node --version'
				sh 'docker ps -a'
            }
        }
    }
}